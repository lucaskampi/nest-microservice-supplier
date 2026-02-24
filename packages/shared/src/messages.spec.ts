import { RABBITMQ_QUEUES, PurchaseCreatedMessage, OrderCompletedMessage, DeliveryCompletedMessage, PurchaseCompletedMessage, PurchaseFailedMessage } from './messages'
import { AddressDTO, PurchaseItemDTO, CreatePurchaseDTO, InfoProviderDTO, InfoOrderDTO, VoucherDTO, InfoDeliveryDTO, PurchaseResponseDTO, UserDTO, AuthResponseDTO } from './interfaces'
import { PurchaseState, OrderState, DeliveryStatus } from './enums'

describe('Shared Package', () => {
  describe('RABBITMQ_QUEUES', () => {
    it('should have all required queue names', () => {
      expect(RABBITMQ_QUEUES.PURCHASE_CREATED).toBe('purchase.created')
      expect(RABBITMQ_QUEUES.ORDER_COMPLETED).toBe('order.completed')
      expect(RABBITMQ_QUEUES.DELIVERY_COMPLETED).toBe('delivery.completed')
      expect(RABBITMQ_QUEUES.PURCHASE_COMPLETED).toBe('purchase.completed')
      expect(RABBITMQ_QUEUES.PURCHASE_FAILED).toBe('purchase.failed')
    })

    it('should have correct queue constants', () => {
      expect(Object.keys(RABBITMQ_QUEUES)).toHaveLength(5)
    })
  })

  describe('PurchaseCreatedMessage', () => {
    it('should have correct shape', () => {
      const message: PurchaseCreatedMessage = {
        purchaseId: 1,
        items: [{ id: 1, amount: 2 }],
        address: { street: 'Main St', number: 123, state: 'SP' },
        state: 'SP',
      }

      expect(message.purchaseId).toBe(1)
      expect(message.items).toHaveLength(1)
      expect(message.address.state).toBe('SP')
    })
  })

  describe('OrderCompletedMessage', () => {
    it('should have correct shape', () => {
      const message: OrderCompletedMessage = {
        purchaseId: 1,
        orderId: 100,
        preparationTime: 5,
        providerAddress: 'Provider Address',
      }

      expect(message.purchaseId).toBe(1)
      expect(message.orderId).toBe(100)
      expect(message.preparationTime).toBe(5)
    })
  })

  describe('DeliveryCompletedMessage', () => {
    it('should have correct shape', () => {
      const message: DeliveryCompletedMessage = {
        purchaseId: 1,
        orderId: 100,
        voucherNumber: 12345,
        deliveryForecast: new Date(),
      }

      expect(message.voucherNumber).toBe(12345)
      expect(message.deliveryForecast).toBeInstanceOf(Date)
    })
  })

  describe('PurchaseCompletedMessage', () => {
    it('should have correct shape', () => {
      const message: PurchaseCompletedMessage = {
        purchaseId: 1,
        state: 'SP',
        orderId: 100,
        voucher: 12345,
        deliveryDate: new Date(),
        preparationTime: 5,
      }

      expect(message.voucher).toBe(12345)
      expect(message.deliveryDate).toBeInstanceOf(Date)
    })
  })

  describe('PurchaseFailedMessage', () => {
    it('should have correct shape', () => {
      const message: PurchaseFailedMessage = {
        purchaseId: 1,
        error: 'Payment failed',
        lastKnownState: 'PENDING',
      }

      expect(message.error).toBe('Payment failed')
      expect(message.lastKnownState).toBe('PENDING')
    })
  })

  describe('Interfaces', () => {
    it('AddressDTO should have required fields', () => {
      const address: AddressDTO = {
        street: 'Street',
        number: 123,
        state: 'SP',
      }
      expect(address.street).toBeDefined()
      expect(address.number).toBeDefined()
      expect(address.state).toBeDefined()
    })

    it('PurchaseItemDTO should have required fields', () => {
      const item: PurchaseItemDTO = { id: 1, amount: 5 }
      expect(item.id).toBeDefined()
      expect(item.amount).toBeDefined()
    })

    it('CreatePurchaseDTO should have required fields', () => {
      const purchase: CreatePurchaseDTO = {
        items: [{ id: 1, amount: 2 }],
        address: { street: 'X', number: 1, state: 'SP' },
      }
      expect(purchase.items).toBeDefined()
      expect(purchase.address).toBeDefined()
    })

    it('InfoProviderDTO should have required fields', () => {
      const info: InfoProviderDTO = { address: 'Address' }
      expect(info.address).toBeDefined()
    })

    it('InfoOrderDTO should have required fields', () => {
      const order: InfoOrderDTO = { id: 1, preparationTime: 5 }
      expect(order.id).toBeDefined()
      expect(order.preparationTime).toBeDefined()
    })

    it('VoucherDTO should have required fields', () => {
      const voucher: VoucherDTO = { number: 123, deliveryForecast: new Date() }
      expect(voucher.number).toBeDefined()
      expect(voucher.deliveryForecast).toBeInstanceOf(Date)
    })

    it('InfoDeliveryDTO should have required fields', () => {
      const delivery: InfoDeliveryDTO = {
        orderId: 1,
        deliveryDate: new Date(),
        originAddress: 'Origin',
        destinationAddress: 'Destination',
      }
      expect(delivery.orderId).toBeDefined()
      expect(delivery.deliveryDate).toBeInstanceOf(Date)
    })

    it('PurchaseResponseDTO should have required fields', () => {
      const response: PurchaseResponseDTO = {
        id: 1,
        orderId: 1,
        preparationTime: 5,
        destinationAddress: 'Address',
        deliveryDate: new Date(),
        voucher: 123,
        state: 'SP',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      expect(response.id).toBeDefined()
      expect(response.createdAt).toBeInstanceOf(Date)
    })

    it('UserDTO should have required fields', () => {
      const user: UserDTO = { id: 1, email: 'test@test.com', role: 'USER' }
      expect(user.id).toBeDefined()
      expect(user.email).toBeDefined()
      expect(user.role).toBe('USER')
    })

    it('AuthResponseDTO should have required fields', () => {
      const auth: AuthResponseDTO = {
        access_token: 'token',
        user: { id: 1, email: 'test@test.com', role: 'USER' },
      }
      expect(auth.access_token).toBeDefined()
      expect(auth.user).toBeDefined()
    })
  })

  describe('Enums', () => {
    it('PurchaseState should have all states', () => {
      expect(PurchaseState.RECEIVED).toBe('RECEIVED')
      expect(PurchaseState.ORDER_REQUESTED).toBe('ORDER_REQUESTED')
      expect(PurchaseState.RESERVE_DELIVERED).toBe('RESERVE_DELIVERED')
      expect(PurchaseState.COMPLETED).toBe('COMPLETED')
      expect(PurchaseState.FAILED).toBe('FAILED')
    })

    it('OrderState should have all states', () => {
      expect(OrderState.PENDING).toBe('PENDING')
      expect(OrderState.PROCESSING).toBe('PROCESSING')
      expect(OrderState.COMPLETED).toBe('COMPLETED')
      expect(OrderState.FAILED).toBe('FAILED')
    })

    it('DeliveryStatus should have all statuses', () => {
      expect(DeliveryStatus.PENDING).toBe('PENDING')
      expect(DeliveryStatus.BOOKED).toBe('BOOKED')
      expect(DeliveryStatus.IN_TRANSIT).toBe('IN_TRANSIT')
      expect(DeliveryStatus.DELIVERED).toBe('DELIVERED')
      expect(DeliveryStatus.FAILED).toBe('FAILED')
    })
  })
})
