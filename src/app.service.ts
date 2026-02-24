import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common'
import { PrismaService } from './prisma/prisma.service'
import { RabbitMQService } from './rabbitmq/rabbitmq.service'
import { RABBITMQ_QUEUES, PurchaseCreatedMessage, OrderCompletedMessage } from '@nest-microservices/shared'

interface PurchaseItem {
  id: number
  amount: number
}

interface Address {
  street: string
  number: number
  state: string
}

@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger(AppService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitMQ: RabbitMQService,
  ) {}

  async onModuleInit() {
    await this.setupConsumers()
  }

  private async setupConsumers() {
    await this.rabbitMQ.consume(RABBITMQ_QUEUES.PURCHASE_CREATED, this.handlePurchaseCreated.bind(this))
  }

  private async handlePurchaseCreated(message: PurchaseCreatedMessage) {
    this.logger.log(`Processing purchase ${message.purchaseId}`)

    try {
      const providerInfo = await this.getProviderInfo(message.address.state)
      const orderInfo = await this.placeOrder(message.items)

      const orderCompletedMessage: OrderCompletedMessage = {
        purchaseId: message.purchaseId,
        orderId: orderInfo.id,
        preparationTime: orderInfo.preparationTime,
        providerAddress: providerInfo.address,
      }

      await this.rabbitMQ.publish(RABBITMQ_QUEUES.ORDER_COMPLETED, orderCompletedMessage)
      this.logger.log(`Order completed for purchase ${message.purchaseId}`)
    } catch (error) {
      this.logger.error(`Failed to process purchase ${message.purchaseId}`, error)
    }
  }

  async getProviderInfo(state: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { state },
    })

    if (!provider) {
      return { address: 'Endereço padrão, Estado desconhecido' }
    }

    return { address: provider.address }
  }

  async placeOrder(items: Array<{ id: number; amount: number }>) {
    const orderId = Math.floor(Math.random() * 10000)
    const preparationTime = Math.floor(Math.random() * 5) + 1

    return {
      id: orderId,
      preparationTime,
    }
  }

  async seedProviders() {
    const states = [
      { state: 'SP', address: 'Rua das Flores, 456, São Paulo' },
      { state: 'RJ', address: 'Avenida Atlântica, 789, Rio de Janeiro' },
      { state: 'MG', address: 'Rua das Minas, 321, Belo Horizonte' },
      { state: 'RS', address: 'Av. Borges de Medeiros, 100, Porto Alegre' },
      { state: 'PR', address: 'Rua XV de Novembro, 500, Curitiba' },
    ]

    for (const state of states) {
      await this.prisma.provider.upsert({
        where: { state: state.state },
        update: {},
        create: state,
      })
    }

    this.logger.log('Providers seeded successfully')
  }
}
