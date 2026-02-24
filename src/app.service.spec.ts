import { Test, TestingModule } from '@nestjs/testing'
import { AppService } from './app.service'
import { PrismaService } from './prisma/prisma.service'
import { RabbitMQService } from './rabbitmq/rabbitmq.service'
import { RABBITMQ_QUEUES } from '@nest-microservices/shared'
import { mockDeep, mock } from 'jest-mock-extended'

describe('AppService', () => {
  let service: AppService
  let prisma: ReturnType<typeof mockDeep<PrismaService>>
  let rabbitMQ: ReturnType<typeof mockDeep<RabbitMQService>>

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>()
    rabbitMQ = mockDeep<RabbitMQService>()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        { provide: PrismaService, useValue: prisma },
        { provide: RabbitMQService, useValue: rabbitMQ },
      ],
    }).compile()

    service = module.get<AppService>(AppService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('getProviderInfo', () => {
    it('should return provider address when provider exists', async () => {
      const mockProvider = { id: 1, state: 'SP', address: 'Rua das Flores, 456, São Paulo' }
      prisma.provider.findUnique.mockResolvedValue(mockProvider)

      const result = await service.getProviderInfo('SP')

      expect(result).toEqual({ address: 'Rua das Flores, 456, São Paulo' })
      expect(prisma.provider.findUnique).toHaveBeenCalledWith({ where: { state: 'SP' } })
    })

    it('should return default address when provider does not exist', async () => {
      prisma.provider.findUnique.mockResolvedValue(null)

      const result = await service.getProviderInfo('XX')

      expect(result).toEqual({ address: 'Endereço padrão, Estado desconhecido' })
    })

    it('should handle empty state string', async () => {
      prisma.provider.findUnique.mockResolvedValue(null)

      const result = await service.getProviderInfo('')

      expect(result).toEqual({ address: 'Endereço padrão, Estado desconhecido' })
    })
  })

  describe('placeOrder', () => {
    it('should return order id and preparation time', async () => {
      const items = [{ id: 1, amount: 2 }, { id: 2, amount: 1 }]

      const result = await service.placeOrder(items)

      expect(result).toHaveProperty('id')
      expect(result).toHaveProperty('preparationTime')
      expect(typeof result.id).toBe('number')
      expect(typeof result.preparationTime).toBe('number')
    })

    it('should handle empty items array', async () => {
      const result = await service.placeOrder([])

      expect(result).toHaveProperty('id')
      expect(result).toHaveProperty('preparationTime')
    })
  })

  describe('seedProviders', () => {
    it('should seed all providers', async () => {
      prisma.provider.upsert.mockResolvedValue({ id: 1, state: 'SP', address: '' })

      await service.seedProviders()

      expect(prisma.provider.upsert).toHaveBeenCalledTimes(5)
    })

    it('should handle existing providers with upsert', async () => {
      prisma.provider.upsert.mockResolvedValue({ id: 1, state: 'SP', address: '' })

      await service.seedProviders()

      expect(prisma.provider.upsert).toHaveBeenCalledWith({
        where: { state: 'SP' },
        update: {},
        create: { state: 'SP', address: 'Rua das Flores, 456, São Paulo' },
      })
    })
  })

  describe('handlePurchaseCreated', () => {
    it('should process purchase and publish order completed message', async () => {
      const message = {
        purchaseId: 123,
        items: [{ id: 1, amount: 2 }],
        address: { street: 'Main St', number: 123, state: 'SP' },
        state: 'SP',
      }

      prisma.provider.findUnique.mockResolvedValue({ id: 1, state: 'SP', address: 'Test Address' })
      rabbitMQ.publish.mockResolvedValue(true)

      await (service as any).handlePurchaseCreated(message)

      expect(rabbitMQ.publish).toHaveBeenCalledWith(
        RABBITMQ_QUEUES.ORDER_COMPLETED,
        expect.objectContaining({
          purchaseId: 123,
          orderId: expect.any(Number),
          preparationTime: expect.any(Number),
          providerAddress: 'Test Address',
        }),
      )
    })

    it('should handle errors gracefully', async () => {
      const message = {
        purchaseId: 123,
        items: [{ id: 1, amount: 2 }],
        address: { street: 'Main St', number: 123, state: 'SP' },
        state: 'SP',
      }

      prisma.provider.findUnique.mockRejectedValue(new Error('DB Error'))

      await expect(async () => {
        await (service as any).handlePurchaseCreated(message)
      }).not.toThrow()
    })

    it('should use default provider address when provider not found', async () => {
      const message = {
        purchaseId: 456,
        items: [{ id: 1, amount: 1 }],
        address: { street: 'X', number: 1, state: 'XX' },
        state: 'XX',
      }

      prisma.provider.findUnique.mockResolvedValue(null)
      rabbitMQ.publish.mockResolvedValue(true)

      await (service as any).handlePurchaseCreated(message)

      expect(rabbitMQ.publish).toHaveBeenCalledWith(
        RABBITMQ_QUEUES.ORDER_COMPLETED,
        expect.objectContaining({
          providerAddress: 'Endereço padrão, Estado desconhecido',
        }),
      )
    })
  })

  describe('onModuleInit', () => {
    it('should setup consumers on module init', async () => {
      rabbitMQ.consume.mockResolvedValue()

      await service.onModuleInit()

      expect(rabbitMQ.consume).toHaveBeenCalledWith(
        RABBITMQ_QUEUES.PURCHASE_CREATED,
        expect.any(Function),
      )
    })
  })
})
