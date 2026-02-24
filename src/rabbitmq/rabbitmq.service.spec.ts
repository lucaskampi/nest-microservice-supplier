import { Test, TestingModule } from '@nestjs/testing'
import { RabbitMQService } from './rabbitmq.service'
import * as amqp from 'amqplib'

jest.mock('amqplib')

describe('RabbitMQService', () => {
  let service: RabbitMQService
  let mockChannel: {
    assertExchange: jest.Mock
    assertQueue: jest.Mock
    bindQueue: jest.Mock
    consume: jest.Mock
    publish: jest.Mock
    ack: jest.Mock
    nack: jest.Mock
    close: jest.Mock
  }
  let mockConnection: {
    createChannel: jest.Mock
    close: jest.Mock
  }

  beforeEach(async () => {
    mockChannel = {
      assertExchange: jest.fn().mockResolvedValue({}),
      assertQueue: jest.fn().mockResolvedValue({}),
      bindQueue: jest.fn().mockResolvedValue({}),
      consume: jest.fn(),
      publish: jest.fn().mockReturnValue(true),
      ack: jest.fn(),
      nack: jest.fn(),
      close: jest.fn().mockResolvedValue({}),
    }

    mockConnection = {
      createChannel: jest.fn().mockResolvedValue(mockChannel),
      close: jest.fn().mockResolvedValue({}),
    }

    ;(amqp.connect as jest.Mock).mockResolvedValue(mockConnection)

    const module: TestingModule = await Test.createTestingModule({
      providers: [RabbitMQService],
    }).compile()

    service = module.get<RabbitMQService>(RabbitMQService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('onModuleInit', () => {
    it('should connect to RabbitMQ', async () => {
      await service.onModuleInit()

      expect(amqp.connect).toHaveBeenCalledWith('amqp://guest:guest@localhost:5672')
      expect(mockConnection.createChannel).toHaveBeenCalled()
      expect(mockChannel.assertExchange).toHaveBeenCalledWith('purchase', 'topic', { durable: true })
    })

    it('should use custom RabbitMQ URL from environment', async () => {
      const originalEnv = process.env.RABBITMQ_URL
      process.env.RABBITMQ_URL = 'amqp://custom:pass@localhost:5673'

      ;(amqp.connect as jest.Mock).mockClear()
      ;(amqp.connect as jest.Mock).mockResolvedValue(mockConnection)

      const newService = new RabbitMQService()
      await newService.onModuleInit()

      expect(amqp.connect).toHaveBeenCalledWith('amqp://custom:pass@localhost:5673')

      process.env.RABBITMQ_URL = originalEnv
    })

    it('should handle connection error gracefully', async () => {
      ;(amqp.connect as jest.Mock).mockRejectedValue(new Error('Connection failed'))

      const newService = new RabbitMQService()
      await expect(newService.onModuleInit()).resolves.not.toThrow()
    })
  })

  describe('onModuleDestroy', () => {
    it('should close channel and connection', async () => {
      await service.onModuleInit()
      await service.onModuleDestroy()

      expect(mockChannel.close).toHaveBeenCalled()
      expect(mockConnection.close).toHaveBeenCalled()
    })

    it('should handle close errors gracefully', async () => {
      await service.onModuleInit()
      mockChannel.close.mockRejectedValue(new Error('Close failed'))
      mockConnection.close.mockRejectedValue(new Error('Close failed'))

      await expect(service.onModuleDestroy()).resolves.not.toThrow()
    })
  })

  describe('publish', () => {
    beforeEach(async () => {
      await service.onModuleInit()
    })

    it('should publish message to exchange', async () => {
      const message = { purchaseId: 123, orderId: 456 }
      const result = await service.publish('order.completed', message)

      expect(result).toBe(true)
      expect(mockChannel.publish).toHaveBeenCalledWith(
        'purchase',
        'order.completed',
        expect.any(Buffer),
        { persistent: true, contentType: 'application/json' },
      )
    })

    it('should return false when channel is not available', async () => {
      const newService = new RabbitMQService()
      const message = { test: 'data' }
      const result = await newService.publish('test.queue', message)

      expect(result).toBe(false)
    })

    it('should handle publish errors gracefully', async () => {
      mockChannel.publish.mockImplementation(() => {
        throw new Error('Publish failed')
      })

      const result = await service.publish('test.queue', { test: 'data' })

      expect(result).toBe(false)
    })
  })

  describe('consume', () => {
    beforeEach(async () => {
      await service.onModuleInit()
    })

    it('should setup consumer for queue', async () => {
      const callback = jest.fn()

      await service.consume('purchase.created', callback)

      expect(mockChannel.assertQueue).toHaveBeenCalledWith('purchase.created', { durable: true })
      expect(mockChannel.bindQueue).toHaveBeenCalledWith('purchase.created', 'purchase', 'purchase.created')
      expect(mockChannel.consume).toHaveBeenCalledWith('purchase.created', expect.any(Function))
    })

    it('should return early when channel is not available', async () => {
      const newService = new RabbitMQService()

      await newService.consume('test.queue', jest.fn())

      expect(mockChannel.assertQueue).not.toHaveBeenCalled()
    })

    it('should handle consume errors gracefully', async () => {
      mockChannel.consume.mockImplementation(() => {
        throw new Error('Consume failed')
      })

      await expect(
        service.consume('test.queue', jest.fn()),
      ).resolves.not.toThrow()
    })

    it('should process message and ack on success', async () => {
      const callback = jest.fn().mockResolvedValue(undefined)
      const testMessage = { purchaseId: 123 }

      await service.consume('purchase.created', callback)

      const consumeCallback = mockChannel.consume.mock.calls[0][1]
      consumeCallback({
        content: Buffer.from(JSON.stringify(testMessage)),
      } as any)

      await new Promise(resolve => setTimeout(resolve, 10))

      expect(callback).toHaveBeenCalledWith(testMessage)
      expect(mockChannel.ack).toHaveBeenCalled()
    })

    it('should nack message on error', async () => {
      const callback = jest.fn().mockRejectedValue(new Error('Processing failed'))
      const testMessage = { purchaseId: 123 }

      await service.consume('purchase.created', callback)

      const consumeCallback = mockChannel.consume.mock.calls[0][1]
      consumeCallback({
        content: Buffer.from(JSON.stringify(testMessage)),
      } as any)

      await new Promise(resolve => setTimeout(resolve, 10))

      expect(mockChannel.nack).toHaveBeenCalledWith(expect.any(Object), false, false)
    })

    it('should handle malformed JSON gracefully', async () => {
      const callback = jest.fn()

      await service.consume('purchase.created', callback)

      const consumeCallback = mockChannel.consume.mock.calls[0][1]
      consumeCallback({
        content: Buffer.from('not valid json'),
      } as any)

      await new Promise(resolve => setTimeout(resolve, 10))

      expect(mockChannel.nack).toHaveBeenCalled()
    })
  })

  describe('isConnected', () => {
    it('should return false when not connected', () => {
      const newService = new RabbitMQService()
      expect(newService.isConnected()).toBe(false)
    })

    it('should return true when connected', async () => {
      await service.onModuleInit()
      expect(service.isConnected()).toBe(true)
    })

    it('should return false when only connection exists but no channel', async () => {
      const newService = new RabbitMQService()
      await (service as any).onModuleInit.call(newService)
      ;(newService as any).connection = {} as any
      ;(newService as any).channel = null

      expect(newService.isConnected()).toBe(false)
    })
  })
})
