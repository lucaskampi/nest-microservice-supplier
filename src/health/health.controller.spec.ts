import { Test, TestingModule } from '@nestjs/testing'
import { HealthController } from './health.controller'
import { HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus'
import { PrismaService } from '../prisma/prisma.service'

describe('HealthController', () => {
  let controller: HealthController
  let healthCheckService: HealthCheckService
  let prismaHealthIndicator: PrismaHealthIndicator
  let prismaService: PrismaService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: { check: jest.fn() } },
        { provide: PrismaHealthIndicator, useValue: { pingCheck: jest.fn() } },
        { provide: PrismaService, useValue: { $queryRaw: jest.fn() } },
      ],
    }).compile()

    controller = module.get<HealthController>(HealthController)
    healthCheckService = module.get<HealthCheckService>(HealthCheckService)
    prismaHealthIndicator = module.get<PrismaHealthIndicator>(PrismaHealthIndicator)
    prismaService = module.get<PrismaService>(PrismaService)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('check', () => {
    it('should perform health check with database', async () => {
      const mockResult = { status: 'ok', info: { database: { status: 'up' } } }
      ;(healthCheckService.check as jest.Mock).mockImplementation(async (checks) => {
        for (const check of checks) {
          await check()
        }
        return mockResult
      })
      ;(prismaHealthIndicator.pingCheck as jest.Mock).mockResolvedValue({ status: 'up' })

      const result = await controller.check()

      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
      ])
      expect(prismaHealthIndicator.pingCheck).toHaveBeenCalledWith('database', prismaService)
      expect(result).toEqual(mockResult)
    })
  })

  describe('live', () => {
    it('should return liveness status', () => {
      const result = controller.live()

      expect(result).toHaveProperty('status', 'ok')
      expect(result).toHaveProperty('timestamp')
    })
  })

  describe('ready', () => {
    it('should return ready status when database is ready', async () => {
      ;(prismaService.$queryRaw as jest.Mock).mockResolvedValue([])

      const result = await controller.ready()

      expect(result).toHaveProperty('status', 'ready')
      expect(result).toHaveProperty('timestamp')
      expect(prismaService.$queryRaw).toHaveBeenCalled()
    })

    it('should return not ready status when database query fails', async () => {
      ;(prismaService.$queryRaw as jest.Mock).mockRejectedValue(new Error('DB down'))

      const result = await controller.ready()

      expect(result).toHaveProperty('status', 'not ready')
      expect(result).toHaveProperty('timestamp')
    })
  })
})
