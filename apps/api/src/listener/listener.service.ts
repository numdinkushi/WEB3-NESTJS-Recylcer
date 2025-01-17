/* eslint-disable prettier/prettier */
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ethers } from 'ethers'
import {
  RecycleChain,
  RecycleChain__factory,
} from '../../../../standalone/recylce-chain-contract/typechain-types'
import { contractAddress } from 'src/common/utils'
import { PrismaService } from 'src/common/prisma/prisma.service'
import { ProductStatus } from '@prisma/client'

const statusMapping = [
  ProductStatus.MANUFACTURED,
  ProductStatus.RECYCLED,
  ProductStatus.RETURNED,
  ProductStatus.SOLD,
]

@Injectable()
export class ListenerService implements OnModuleInit, OnModuleDestroy {
  private provider: ethers.WebSocketProvider
  private contract: RecycleChain

  constructor(private readonly prisma: PrismaService) {}
  onModuleInit() {
    // initialize web socket provider
    this.initializeWebSocketProvider()
    // set up subscriber
    this.subscribeToEvents()
  }

  onModuleDestroy() {
    this.cleanup()
  }

  initializeWebSocketProvider() {
    const infuraWsUrl = `wss://polygon-amoy.infura.io/ws/v3/${process.env.INFURA_KEY}`
    this.provider = new ethers.WebSocketProvider(infuraWsUrl)
    this.contract = RecycleChain__factory.connect(
      contractAddress,
      this.provider,
    )
  }

  subscribeToEvents() {
    try {
      this.contract.on(
        this.contract.filters.ManufacturerRegistered,
        async (manufacturer, name, location, contact, event) => {
          // @ts-expect-error //the block number does not exist inside the event.blockNumber
          const blockNumber = event.log.blockNumber
          const timestamp = await this.getBlockTimeStamp(blockNumber)

          await this.createManufacturer({
            contact,
            id: manufacturer,
            location,
            name,
            timestamp,
          })
          // const createdManufacturer = await this.prisma.manufacturer.create({
          //     data: { contact, id: manufacturer, location, name, timestamp }
          // });

          // console.log('Manufacturer created:', createdManufacturer);
        },
      )

      console.log('Event: ManufacturerRegistered Listening')
    } catch (error) {
      console.log('Event: ManufacturerRegistered: Listener setup failed', error)
    }

    try {
      this.contract.on(
        this.contract.filters.ProductCreated,
        async (productId, name, manufacturerId, event) => {
          // @ts-expect-error //the block number does not exist inside the event.blockNumber
          const blockNumber = event.log.blockNumber
          const timestamp = await this.getBlockTimeStamp(blockNumber)

          await this.createProduct({
            manufacturerId,
            productId: productId.toString(),
            name,
            timestamp,
          })
        },
      )

      console.log('Event: Product Created  Listening...')
    } catch (error) {
      console.log('Event: Product Created: Listener setup failed', error)
    }

    try {
      this.contract.on(
        this.contract.filters.ProductItemAdded,
        async (productItemIds, productId, event) => {
          // @ts-expect-error //the block number does not exist inside the event.blockNumber
          const blockNumber = event.log.blockNumber
          const timestamp = await this.getBlockTimeStamp(blockNumber)

          const items = await this.createProductItems({
            productId: productId.toString(),
            productItemIds,
            timestamp,
          })

          console.log('items', items)
        },
      )

      console.log('Event: ProductItemsAdded Listening...')
    } catch (error) {
      console.log(
        'Event: ProductItemsAdded Listening: Listener setup failed.',
        error,
      )
    }

    try {
      this.contract.on(
        this.contract.filters.ProductItemsStatusChanged,
        async (productItemIds, statusIndex, event) => {
          // @ts-expect-error //the block number does not exist inside the event.blockNumber
          const blockNumber = event.log.blockNumber
          const timestamp = await this.getBlockTimeStamp(blockNumber)

          const items = await this.updateProductItemsStatus({
            productItemIds,
            statusIndex: +statusIndex.toString(),
            timestamp,
          })

          console.log('ProductItemsStatusChanged:', items)
        },
      )
    } catch (error) {
      console.log(
        'Event: ProductItemStatusChanged: Listener setup failed',
        error,
      )
    }

    try {
      this.contract.on(
        this.contract.filters.ToxicItemCreated,
        async (productId, name, weight, event) => {
          // @ts-expect-error //the block number does not exist inside the event.blockNumber
          const blockNumber = event.log.blockNumber
          const timestamp = await this.getBlockTimeStamp(blockNumber)

          const newToxicItem = await this.createToxicItem({
            productId: productId.toString(),
            name,
            weight: +weight.toString(),
            timestamp,
          })

          console.log('ToxicItem created:', newToxicItem)
        },
      )

      console.log('Event: ToxicItemCreated Listening...')
    } catch (error) {
      console.log('Event: ToxicItemCreated: Listener setup failed', error)
    }
  }

  cleanup() {
    this.provider.removeAllListeners()
  }

  // utils
  async getBlockTimeStamp(blockNumber: number) {
    const block = await this.provider.getBlock(blockNumber)

    return new Date(block.timestamp * 1000)
  }

  // DB writes
  private async createManufacturer({
    id,
    name,
    location,
    contact,
    timestamp,
  }: {
    id: string
    name: string
    location: string
    contact: string
    timestamp: Date
  }) {
    const manufacturer = await this.prisma.manufacturer.create({
      data: {
        id,
        timestamp,
        contact,
        location,
        name,
      },
    })

    console.log('Manufacturer created:', manufacturer)
  }

  private async createProduct({
    manufacturerId,
    productId,
    name,
    timestamp,
  }: {
    manufacturerId: string
    productId: string
    name: string
    timestamp: Date
  }) {
    const product = await this.prisma.product.create({
      data: {
        id: productId,
        name,
        timestamp,
        manufacturerId,
      },
    })
    console.log('Product created', product)
  }

  private async createProductItems({
    productId,
    productItemIds,
    timestamp,
  }: {
    productItemIds: string[]
    productId: string
    timestamp: Date
  }) {
    const transactions = productItemIds.map((productItemId) => {
      return this.prisma.transaction.create({
        data: {
          id: productItemId, // Ensure this matches the schema
          status: ProductStatus.MANUFACTURED,
          productItemId: productItemId,
          timestamp,
        },
      })
    })

    const productItemUpdates = this.prisma.productItem.createMany({
      data: productItemIds.map((id) => {
        console.log(555, id)
        return {
          id,
          productId: productId.toString(),
          status: ProductStatus.MANUFACTURED,
          timestamp,
        }
      }),
    })

    return this.prisma.$transaction([productItemUpdates, ...transactions])
  }

  private updateProductItemsStatus({
    statusIndex,
    productItemIds,
    timestamp,
  }: {
    statusIndex: number
    productItemIds: string[]
    timestamp: Date
  }) {
    const status = statusMapping[+statusIndex.toString()] as ProductStatus

    const transactions = productItemIds.map((productItemId) => {
      console.log(43333, productItemId)
      return this.prisma.transaction.create({

        data: {
          status,
          id: productItemId,
          timestamp,
        },
      })
    })

    const productItemUpdates = this.prisma.productItem.updateMany({
      data: { status, timestamp },
      where: {
        productId: { in: productItemIds },
        // productId: { equals: productItemIds[0].split('-')[0] } // assuming product id is first part of productItemId
      },
    })

    return this.prisma.$transaction([productItemUpdates, ...transactions])
  }

  private async createToxicItem({
    productId,
    name,
    weight,
    timestamp,
  }: {
    productId: string
    name: string
    weight: number
    timestamp: Date
  }) {
    const maxRetries = 5
    let retryCount = 0
    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms))

    while (retryCount < maxRetries) {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      })

      if (product) {
        const toxicItem = await this.prisma.toxicItem.create({
          data: {
            name,
            weight,
            timestamp,
            productId,
          },
        })

        console.log('ToxicItem created', toxicItem)
        return toxicItem
      } else {
        console.log(`Product not found: ${productId}`)
        await delay(1000) // wait for 1 second before retrying
        retryCount++
      }
    }
  }
}
