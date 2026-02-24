import { Test } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/prisma/prisma.service'
import { RabbitMQService } from '../src/rabbitmq/rabbitmq.service'
import { mockDeep, mockReset } from 'jest-mock-extended'
const request = require('supertest')

describe('AppController (e2e)', () => {
  let app: INestApplication
  let prismaService: ReturnType<typeof mockDeep<PrismaService>>
  let rabbitMQService: ReturnType<typeof mockDeep<RabbitMQService>>

  beforeAll(async () => {
    prismaService = mockDeep<PrismaService>()
    rabbitMQService = mockDeep<RabbitMQService>()

    rabbitMQService.isConnected.mockReturnValue(true)
    rabbitMQService.publish.mockResolvedValue(true)
    rabbitMQService.consume.mockResolvedValue()
    rabbitMQService.onModuleInit.mockResolvedValue()
    rabbitMQService.onModuleDestroy.mockResolvedValue()

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaService)
      .overrideProvider(RabbitMQService)
      .useValue(rabbitMQService)
      .compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ transform: true }))
    await app.init()
  })

  afterAll(async () => {
    await app?.close()
  })

  beforeEach(() => {
    mockReset(prismaService)
    mockReset(rabbitMQService)
  })

  describe('/info/:state (GET)', () => {
    it('should return default address when no provider exists', async () => {
      prismaService.provider.findUnique.mockResolvedValue(null)

      const response = await request(app.getHttpServer())
        .get('/info/SP')
        .expect(200)

      expect(response.body).toEqual({
        address: 'Endereço padrão, Estado desconhecido',
      })
    })

    it('should return provider address when provider exists', async () => {
      prismaService.provider.findUnique.mockResolvedValue({
        id: 1,
        state: 'SP',
        address: 'Rua das Flores, 456, São Paulo',
      })

      const response = await request(app.getHttpServer())
        .get('/info/SP')
        .expect(200)

      expect(response.body).toEqual({
        address: 'Rua das Flores, 456, São Paulo',
      })
    })

    it('should handle different states', async () => {
      prismaService.provider.findUnique.mockResolvedValue({
        id: 1,
        state: 'RJ',
        address: 'Avenida Atlântica, 789, Rio de Janeiro',
      })

      const response = await request(app.getHttpServer())
        .get('/info/RJ')
        .expect(200)

      expect(response.body).toEqual({
        address: 'Avenida Atlântica, 789, Rio de Janeiro',
      })
    })

    it('should return 404 for empty state', async () => {
      const response = await request(app.getHttpServer())
        .get('/info/')
        .expect(404)
    })
  })

  describe('/order (POST)', () => {
    it('should create order with items', async () => {
      const items = [
        { id: 1, amount: 2 },
        { id: 2, amount: 1 },
      ]

      const response = await request(app.getHttpServer())
        .post('/order')
        .send(items)
        .expect(201)

      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('preparationTime')
      expect(typeof response.body.id).toBe('number')
      expect(typeof response.body.preparationTime).toBe('number')
    })

    it('should handle empty items array', async () => {
      const response = await request(app.getHttpServer())
        .post('/order')
        .send([])
        .expect(201)

      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('preparationTime')
    })

    it('should return valid preparation time range', async () => {
      const response = await request(app.getHttpServer())
        .post('/order')
        .send([{ id: 1, amount: 1 }])
        .expect(201)

      expect(response.body.preparationTime).toBeGreaterThanOrEqual(1)
      expect(response.body.preparationTime).toBeLessThanOrEqual(6)
    })
  })
})

describe('HealthController (e2e)', () => {
  let app: INestApplication
  let prismaService: ReturnType<typeof mockDeep<PrismaService>>
  let rabbitMQService: ReturnType<typeof mockDeep<RabbitMQService>>

  beforeAll(async () => {
    prismaService = mockDeep<PrismaService>()
    rabbitMQService = mockDeep<RabbitMQService>()

    rabbitMQService.isConnected.mockReturnValue(true)
    rabbitMQService.publish.mockResolvedValue(true)
    rabbitMQService.consume.mockResolvedValue()
    rabbitMQService.onModuleInit.mockResolvedValue()
    rabbitMQService.onModuleDestroy.mockResolvedValue()

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaService)
      .overrideProvider(RabbitMQService)
      .useValue(rabbitMQService)
      .compile()

    app = moduleFixture.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app?.close()
  })

  describe('/health (GET)', () => {
    it('should return health status', async () => {
      prismaService.$queryRaw.mockResolvedValue([])

      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200)

      expect(response.body).toHaveProperty('status')
      expect(response.body).toHaveProperty('info')
    })
  })

  describe('/health/live (GET)', () => {
    it('should return liveness', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/live')
        .expect(200)

      expect(response.body).toHaveProperty('status', 'ok')
      expect(response.body).toHaveProperty('timestamp')
    })

    it('should return valid timestamp', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/live')
        .expect(200)

      const timestamp = new Date(response.body.timestamp)
      expect(timestamp.getTime()).toBeGreaterThan(0)
    })
  })

  describe('/health/ready (GET)', () => {
    it('should return ready when database is connected', async () => {
      prismaService.$queryRaw.mockResolvedValue([])

      const response = await request(app.getHttpServer())
        .get('/health/ready')
        .expect(200)

      expect(response.body).toHaveProperty('status', 'ready')
      expect(response.body).toHaveProperty('timestamp')
    })

    it('should return not ready when database is down', async () => {
      prismaService.$queryRaw.mockRejectedValue(new Error('DB down'))

      const response = await request(app.getHttpServer())
        .get('/health/ready')
        .expect(200)

      expect(response.body).toHaveProperty('status', 'not ready')
    })
  })
})
