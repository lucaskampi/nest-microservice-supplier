# NestJS Microservice - Supplier Service

Supplier microservice for order fulfillment and inventory management.

## Overview

This service handles order processing from the Store service, manages inventory, and communicates via RabbitMQ message queue.

## Tech Stack

- **NestJS** - Backend framework
- **TypeScript** - Programming language
- **Prisma** - ORM (PostgreSQL)
- **RabbitMQ** - Message queue

## Configuration

```bash
# Environment variables (.env)
PORT=4001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/supplier
RABBITMQ_URL=amqp://guest:guest@localhost:5672
```

## Getting Started

```bash
# Install dependencies
npm install

# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Start development server
npm run dev

# Run tests
npm run test
npm run test:cov
```

## Docker

```bash
docker build -t nest-microservice-supplier .
docker run -p 4001:4001 nest-microservice-supplier
```

## API

- **Base URL**: `http://localhost:4001/api`
- **Swagger Docs**: `http://localhost:4001/api/docs`
- **Health Check**: `http://localhost:4001/api/health`

## Message Queues

Consumes from:
- `purchase.created` - New purchase orders from Store

Publishes to:
- `order.completed` - Order processed successfully
- `purchase.failed` - Order processing failed

---

> This service was extracted from the monorepo `nest-microservice-store` as part of a microservices migration. Initial commits were done via multi-agent setup to avoid merge conflicts.
