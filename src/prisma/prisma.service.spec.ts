import { Test, TestingModule } from '@nestjs/testing'
import { PrismaService } from './prisma.service'

describe('PrismaService', () => {
  let service: PrismaService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile()

    service = module.get<PrismaService>(PrismaService)

    service.$connect = jest.fn().mockResolvedValue(undefined)
    service.$disconnect = jest.fn().mockResolvedValue(undefined)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('onModuleInit', () => {
    it('should connect to database', async () => {
      await service.onModuleInit()

      expect(service.$connect).toHaveBeenCalled()
    })

    it('should handle connection error', async () => {
      ;(service.$connect as jest.Mock).mockRejectedValue(new Error('Connection failed'))

      await expect(service.onModuleInit()).rejects.toThrow('Connection failed')
    })
  })

  describe('onModuleDestroy', () => {
    it('should disconnect from database', async () => {
      await service.onModuleDestroy()

      expect(service.$disconnect).toHaveBeenCalled()
    })

    it('should handle disconnection error', async () => {
      ;(service.$disconnect as jest.Mock).mockRejectedValue(new Error('Disconnect failed'))

      await expect(service.onModuleDestroy()).rejects.toThrow('Disconnect failed')
    })
  })
})
