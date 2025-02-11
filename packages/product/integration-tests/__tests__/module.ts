import { MedusaModule, Modules } from "@medusajs/modules-sdk"
import { IProductModuleService } from "@medusajs/types"
import { kebabCase } from "@medusajs/utils"
import { knex } from "@mikro-orm/knex"
import { initModules } from "medusa-test-utils"
import * as CustomRepositories from "../__fixtures__/module"
import {
  buildProductAndRelationsData,
  createProductAndTags,
} from "../__fixtures__/product"
import { productsData } from "../__fixtures__/product/data"
import { DB_URL, TestDatabase } from "../utils"
import { getInitModuleConfig } from "../utils/get-init-module-config"

const sharedPgConnection = knex<any, any>({
  client: "pg",
  searchPath: process.env.MEDUSA_PRODUCT_DB_SCHEMA,
  connection: {
    connectionString: DB_URL,
  },
})

const beforeEach_ = async () => {
  await TestDatabase.setupDatabase()
  return await TestDatabase.forkManager()
}

const afterEach_ = async () => {
  await TestDatabase.clearDatabase()
}

describe("Product module", function () {
  describe("Using built-in data access layer", function () {
    let module: IProductModuleService
    let shutdownFunc: () => Promise<void>

    beforeAll(async () => {
      MedusaModule.clearInstances()
      const initModulesConfig = getInitModuleConfig()

      const { medusaApp, shutdown } = await initModules(initModulesConfig)

      module = medusaApp.modules[Modules.PRODUCT]

      shutdownFunc = shutdown
    })

    afterAll(async () => {
      await shutdownFunc()
    })

    beforeEach(async () => {
      const testManager = await beforeEach_()
      await createProductAndTags(testManager, productsData)
    })

    afterEach(afterEach_)

    it("should initialize", async () => {
      expect(module).toBeDefined()
    })

    it("should have a connection that is not the shared connection", async () => {
      expect(
        (module as any).baseRepository_.manager_.getConnection().client
      ).not.toEqual(sharedPgConnection)
    })

    it("should return a list of product", async () => {
      const products = await module.list()
      expect(products).toHaveLength(3)
    })
  })

  describe("Using custom data access layer", function () {
    let module
    let shutdownFunc: () => Promise<void>

    beforeAll(async () => {
      MedusaModule.clearInstances()
      const initModulesConfig = getInitModuleConfig({
        repositories: CustomRepositories,
      })

      const { medusaApp, shutdown } = await initModules(initModulesConfig)

      module = medusaApp.modules[Modules.PRODUCT]

      shutdownFunc = shutdown
    })

    afterAll(async () => {
      await shutdownFunc()
    })

    beforeEach(async () => {
      const testManager = await beforeEach_()
      await createProductAndTags(testManager, productsData)
    })

    afterEach(afterEach_)

    it("should initialize", async () => {
      expect(module).toBeDefined()
    })

    it("should have a connection that is not the shared connection", async () => {
      expect(
        (module as any).baseRepository_.manager_.getConnection().client
      ).not.toEqual(sharedPgConnection)
    })

    it("should return a list of product", async () => {
      const products = await module.list()

      expect(module.productService_.productRepository_.find).toHaveBeenCalled()
      expect(products).toHaveLength(0)
    })
  })

  describe("Using custom data access layer and manager", function () {
    let module
    let shutdownFunc: () => Promise<void>

    afterEach(async () => {
      await shutdownFunc()
    })

    beforeEach(async () => {
      const testManager = await beforeEach_()
      await createProductAndTags(testManager, productsData)

      MedusaModule.clearInstances()
      const initModulesConfig = getInitModuleConfig({
        manager: testManager,
        repositories: CustomRepositories,
      })

      const { medusaApp, shutdown } = await initModules(initModulesConfig)

      module = medusaApp.modules[Modules.PRODUCT]

      shutdownFunc = shutdown
    })

    afterEach(afterEach_)

    it("should initialize and return a list of product", async () => {
      expect(module).toBeDefined()
    })

    it("should have a connection that is not the shared connection", async () => {
      expect(
        (module as any).baseRepository_.manager_.getConnection().client
      ).not.toEqual(sharedPgConnection)
    })

    it("should return a list of product", async () => {
      const products = await module.list()

      expect(module.productService_.productRepository_.find).toHaveBeenCalled()
      expect(products).toHaveLength(0)
    })
  })

  describe("Using an existing connection", function () {
    let module: IProductModuleService
    let shutdownFunc: () => Promise<void>

    afterEach(async () => {
      await shutdownFunc()
    })

    beforeEach(async () => {
      const testManager = await beforeEach_()
      await createProductAndTags(testManager, productsData)

      MedusaModule.clearInstances()
      const initModulesConfig = getInitModuleConfig({
        database: {
          connection: sharedPgConnection,
        },
      })

      const { medusaApp, shutdown } = await initModules(initModulesConfig)

      module = medusaApp.modules[Modules.PRODUCT]

      shutdownFunc = shutdown
    })

    afterEach(afterEach_)

    it("should initialize and return a list of product", async () => {
      expect(module).toBeDefined()
    })

    it("should have a connection that is the shared connection", async () => {
      expect(
        JSON.stringify(
          (module as any).baseRepository_.manager_.getConnection().client
        )
      ).toEqual(JSON.stringify(sharedPgConnection))
    })
  })

  describe("create", function () {
    let module: IProductModuleService
    let images = ["image-1"]
    let shutdownFunc: () => Promise<void>

    afterEach(async () => {
      await shutdownFunc()
    })

    beforeEach(async () => {
      await beforeEach_()

      MedusaModule.clearInstances()
      const initModulesConfig = getInitModuleConfig({
        database: {
          connection: sharedPgConnection,
        },
      })

      const { medusaApp, shutdown } = await initModules(initModulesConfig)

      module = medusaApp.modules[Modules.PRODUCT]

      shutdownFunc = shutdown
    })

    afterEach(afterEach_)

    it("should create a product", async () => {
      const data = buildProductAndRelationsData({
        images,
        thumbnail: images[0],
      })

      const productsCreated = await module.create([data])

      const products = await module.list(
        { id: productsCreated[0].id },
        {
          relations: [
            "images",
            "categories",
            "variants",
            "variants.options",
            "options",
            "options.values",
            "tags",
            "type",
          ],
        }
      )

      expect(products).toHaveLength(1)

      expect(products[0].images).toHaveLength(1)
      expect(products[0].options).toHaveLength(1)
      expect(products[0].tags).toHaveLength(1)
      expect(products[0].categories).toHaveLength(0)
      expect(products[0].variants).toHaveLength(1)

      expect(products[0]).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          title: data.title,
          handle: kebabCase(data.title),
          description: data.description,
          subtitle: data.subtitle,
          is_giftcard: data.is_giftcard,
          discountable: data.discountable,
          thumbnail: images[0],
          status: data.status,
          images: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              url: images[0],
            }),
          ]),
          options: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              title: data.options[0].title,
              values: expect.arrayContaining([
                expect.objectContaining({
                  id: expect.any(String),
                  value: data.variants[0].options?.[0].value,
                }),
              ]),
            }),
          ]),
          tags: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              value: data.tags[0].value,
            }),
          ]),
          type: expect.objectContaining({
            id: expect.any(String),
            value: data.type.value,
          }),
          variants: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              title: data.variants[0].title,
              sku: data.variants[0].sku,
              allow_backorder: false,
              manage_inventory: true,
              inventory_quantity: 100,
              variant_rank: 0,
              options: expect.arrayContaining([
                expect.objectContaining({
                  id: expect.any(String),
                  value: data.variants[0].options?.[0].value,
                }),
              ]),
            }),
          ]),
        })
      )
    })
  })

  describe("softDelete", function () {
    let module: IProductModuleService
    let images = ["image-1"]
    let shutdownFunc: () => Promise<void>

    afterEach(async () => {
      await shutdownFunc()
    })

    beforeEach(async () => {
      await beforeEach_()

      MedusaModule.clearInstances()

      const initModulesConfig = getInitModuleConfig()

      const { medusaApp, shutdown } = await initModules(initModulesConfig)

      module = medusaApp.modules[Modules.PRODUCT]

      shutdownFunc = shutdown
    })

    afterEach(afterEach_)

    it("should soft delete a product and its cascaded relations", async () => {
      const data = buildProductAndRelationsData({
        images,
        thumbnail: images[0],
      })

      const products = await module.create([data])

      await module.softDelete([products[0].id])
      const deletedProducts = await module.list(
        { id: products[0].id },
        {
          relations: [
            "variants",
            "variants.options",
            "options",
            "options.values",
          ],
          withDeleted: true,
        }
      )

      expect(deletedProducts).toHaveLength(1)
      expect(deletedProducts[0].deleted_at).not.toBeNull()

      for (const option of deletedProducts[0].options) {
        expect(option.deleted_at).not.toBeNull()
      }

      const productOptionsValues = deletedProducts[0].options
        .map((o) => o.values)
        .flat()

      for (const optionValue of productOptionsValues) {
        expect(optionValue.deleted_at).not.toBeNull()
      }

      for (const variant of deletedProducts[0].variants) {
        expect(variant.deleted_at).not.toBeNull()
      }

      const variantsOptions = deletedProducts[0].options
        .map((o) => o.values)
        .flat()

      for (const option of variantsOptions) {
        expect(option.deleted_at).not.toBeNull()
      }
    })
  })

  describe("restore", function () {
    let module: IProductModuleService
    let images = ["image-1"]
    let shutdownFunc: () => Promise<void>

    afterEach(async () => {
      await shutdownFunc()
    })

    beforeEach(async () => {
      await beforeEach_()

      MedusaModule.clearInstances()

      const initModulesConfig = getInitModuleConfig()

      const { medusaApp, shutdown } = await initModules(initModulesConfig)

      module = medusaApp.modules[Modules.PRODUCT]

      shutdownFunc = shutdown
    })

    afterEach(afterEach_)

    it("should restore a soft deleted product and its cascaded relations", async () => {
      const data = buildProductAndRelationsData({
        images,
        thumbnail: images[0],
      })

      const products = await module.create([data])

      await module.softDelete([products[0].id])
      await module.restore([products[0].id])

      const deletedProducts = await module.list(
        { id: products[0].id },
        {
          relations: [
            "variants",
            "variants.options",
            "variants.options",
            "options",
            "options.values",
          ],
          withDeleted: true,
        }
      )

      expect(deletedProducts).toHaveLength(1)
      expect(deletedProducts[0].deleted_at).toBeNull()

      for (const option of deletedProducts[0].options) {
        expect(option.deleted_at).toBeNull()
      }

      const productOptionsValues = deletedProducts[0].options
        .map((o) => o.values)
        .flat()

      for (const optionValue of productOptionsValues) {
        expect(optionValue.deleted_at).toBeNull()
      }

      for (const variant of deletedProducts[0].variants) {
        expect(variant.deleted_at).toBeNull()
      }

      const variantsOptions = deletedProducts[0].options
        .map((o) => o.values)
        .flat()

      for (const option of variantsOptions) {
        expect(option.deleted_at).toBeNull()
      }
    })
  })
})
