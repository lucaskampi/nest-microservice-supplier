import { Test, TestingModule } from '@nestjs/testing'
import { AppController } from './app.controller'
import { AppService } from './app.service'

describe('AppController', () => {
  let controller: AppController
  let appService: AppService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: {
            getProviderInfo: jest.fn(),
            placeOrder: jest.fn(),
          },
        },
      ],
    }).compile()

    controller = module.get<AppController>(AppController)
    appService = module.get<AppService>(AppService)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('getProviderInfo', () => {
    it('should return provider info for given state', async () => {
      const mockResult = { address: 'Rua das Flores, 456, São Paulo' }
      ;(appService.getProviderInfo as jest.Mock).mockResolvedValue(mockResult)

      const result = await controller.getProviderInfo('SP')

      expect(appService.getProviderInfo).toHaveBeenCalledWith('SP')
      expect(result).toEqual(mockResult)
    })

    it('should handle empty state', async () => {
      const mockResult = { address: 'Endereço padrão, Estado desconhecido' }
      ;(appService.getProviderInfo as jest.Mock).mockResolvedValue(mockResult)

      const result = await controller.getProviderInfo('')

      expect(appService.getProviderInfo).toHaveBeenCalledWith('')
      expect(result).toEqual(mockResult)
    })
  })

  describe('placeOrder', () => {
    it('should create order with given items', async () => {
      const items = [{ id: 1, amount: 2 }, { id: 2, amount: 1 }]
      const mockResult = { id: 123, preparationTime: 5 }
      ;(appService.placeOrder as jest.Mock).mockResolvedValue(mockResult)

      const result = await controller.placeOrder(items)

      expect(appService.placeOrder).toHaveBeenCalledWith(items)
      expect(result).toEqual(mockResult)
    })

    it('should handle empty items array', async () => {
      const mockResult = { id: 456, preparationTime: 3 }
      ;(appService.placeOrder as jest.Mock).mockResolvedValue(mockResult)

      const result = await controller.placeOrder([])

      expect(appService.placeOrder).toHaveBeenCalledWith([])
      expect(result).toEqual(mockResult)
    })
  })
})
