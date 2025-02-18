import { Modules } from "@medusajs/modules-sdk"
import {
  CreateServiceZoneDTO,
  GeoZoneDTO,
  IFulfillmentModuleService,
  UpdateServiceZoneDTO,
} from "@medusajs/types"
import { GeoZoneType } from "@medusajs/utils"
import { moduleIntegrationTestRunner, SuiteOptions } from "medusa-test-utils"

jest.setTimeout(100000)

moduleIntegrationTestRunner({
  moduleName: Modules.FULFILLMENT,
  testSuite: ({ service }: SuiteOptions<IFulfillmentModuleService>) => {
    describe("Fulfillment Module Service", () => {
      describe("read", () => {
        it("should list service zones with a filter", async function () {
            const fulfillmentSet = await service.create({
              name: "test",
              type: "test-type",
            })

            const createdZone1 = await service.createServiceZones({
              name: "test",
              fulfillment_set_id: fulfillmentSet.id,
            })
            const createdZone2 = await service.createServiceZones({
              name: "test2",
              fulfillment_set_id: fulfillmentSet.id,
              geo_zones: [
                {
                  type: GeoZoneType.COUNTRY,
                  country_code: "fr",
                },
              ],
            })

            let listedZones = await service.listServiceZones({
              name: createdZone2.name,
            })

            expect(listedZones).toEqual(
              expect.arrayContaining([
                expect.objectContaining({ id: createdZone2.id }),
              ])
            )
            expect(listedZones).not.toEqual(
              expect.arrayContaining([
                expect.objectContaining({ id: createdZone1.id }),
              ])
            )

            listedZones = await service.listServiceZones({
              geo_zones: { country_code: "fr" },
            })

            expect(listedZones).toEqual(
              expect.arrayContaining([
                expect.objectContaining({ id: createdZone2.id }),
              ])
            )
            expect(listedZones).not.toEqual(
              expect.arrayContaining([
                expect.objectContaining({ id: createdZone1.id }),
              ])
            )
          })
      })

      describe("mutations", () => {
        describe("on create", () => {
          it("should create a new service zone", async function () {
            const fulfillmentSet = await service.create({
              name: "test",
              type: "test-type",
            })

            const data: CreateServiceZoneDTO = {
              name: "test",
              fulfillment_set_id: fulfillmentSet.id,
              geo_zones: [
                {
                  type: GeoZoneType.COUNTRY,
                  country_code: "fr",
                },
              ],
            }

            const serviceZone = await service.createServiceZones(data)

            expect(serviceZone).toEqual(
              expect.objectContaining({
                id: expect.any(String),
                name: data.name,
                geo_zones: expect.arrayContaining([
                  expect.objectContaining({
                    type: (data.geo_zones![0] as GeoZoneDTO).type,
                    country_code: (data.geo_zones![0] as GeoZoneDTO)
                      .country_code,
                  }),
                ]),
              })
            )
          })

          it("should create a collection of service zones", async function () {
            const fulfillmentSet = await service.create({
              name: "test",
              type: "test-type",
            })

            const data: CreateServiceZoneDTO[] = [
              {
                name: "test",
                fulfillment_set_id: fulfillmentSet.id,
                geo_zones: [
                  {
                    type: GeoZoneType.COUNTRY,
                    country_code: "fr",
                  },
                ],
              },
              {
                name: "test2",
                fulfillment_set_id: fulfillmentSet.id,
                geo_zones: [
                  {
                    type: GeoZoneType.COUNTRY,
                    country_code: "fr",
                  },
                ],
              },
              {
                name: "test3",
                fulfillment_set_id: fulfillmentSet.id,
                geo_zones: [
                  {
                    type: GeoZoneType.COUNTRY,
                    country_code: "uk",
                  },
                ],
              },
            ]

            const serviceZones = await service.createServiceZones(data)

            expect(serviceZones).toHaveLength(3)

            let i = 0
            for (const data_ of data) {
              expect(serviceZones[i]).toEqual(
                expect.objectContaining({
                  id: expect.any(String),
                  name: data_.name,
                  geo_zones: expect.arrayContaining([
                    expect.objectContaining({
                      type: (data_.geo_zones![0] as GeoZoneDTO).type,
                      country_code: (data_.geo_zones![0] as GeoZoneDTO)
                        .country_code,
                    }),
                  ]),
                })
              )
              ++i
            }
          })

          it("should fail on duplicated service zone name", async function () {
            const fulfillmentSet = await service.create({
              name: "test",
              type: "test-type",
            })

            const data: CreateServiceZoneDTO = {
              name: "test",
              fulfillment_set_id: fulfillmentSet.id,
              geo_zones: [
                {
                  type: GeoZoneType.COUNTRY,
                  country_code: "fr",
                },
              ],
            }

            await service.createServiceZones(data)
            const err = await service.createServiceZones(data).catch((e) => e)

            expect(err).toBeDefined()
            expect(err.constraint).toBe("IDX_service_zone_name_unique")
          })
        })

        describe("on update", () => {
          it("should update an existing service zone", async function () {
            const fulfillmentSet = await service.create({
              name: "test",
              type: "test-type",
            })

            const createData: CreateServiceZoneDTO = {
              name: "service-zone-test",
              fulfillment_set_id: fulfillmentSet.id,
              geo_zones: [
                {
                  type: GeoZoneType.COUNTRY,
                  country_code: "fr",
                },
              ],
            }

            const createdServiceZone = await service.createServiceZones(
              createData
            )

            const updateData = {
              id: createdServiceZone.id,
              name: "updated-service-zone-test",
              geo_zones: [
                {
                  id: createdServiceZone.geo_zones[0].id,
                  type: GeoZoneType.COUNTRY,
                  country_code: "us",
                },
              ],
            }

            const updatedServiceZone = await service.updateServiceZones(
              updateData
            )

            expect(updatedServiceZone).toEqual(
              expect.objectContaining({
                id: updateData.id,
                name: updateData.name,
                geo_zones: expect.arrayContaining([
                  expect.objectContaining({
                    id: updateData.geo_zones[0].id,
                    type: updateData.geo_zones[0].type,
                    country_code: updateData.geo_zones[0].country_code,
                  }),
                ]),
              })
            )
          })

          it("should update a collection of service zones", async function () {
            const fulfillmentSet = await service.create({
              name: "test",
              type: "test-type",
            })

            const createData: CreateServiceZoneDTO[] = [
              {
                name: "service-zone-test",
                fulfillment_set_id: fulfillmentSet.id,
                geo_zones: [
                  {
                    type: GeoZoneType.COUNTRY,
                    country_code: "fr",
                  },
                ],
              },
              {
                name: "service-zone-test2",
                fulfillment_set_id: fulfillmentSet.id,
                geo_zones: [
                  {
                    type: GeoZoneType.COUNTRY,
                    country_code: "us",
                  },
                ],
              },
            ]

            const createdServiceZones = await service.createServiceZones(
              createData
            )

            const updateData: UpdateServiceZoneDTO[] = createdServiceZones.map(
              (serviceZone, index) => ({
                id: serviceZone.id,
                name: `updated-service-zone-test${index + 1}`,
                geo_zones: [
                  {
                    type: GeoZoneType.COUNTRY,
                    country_code: index % 2 === 0 ? "us" : "fr",
                  },
                ],
              })
            )

            const updatedServiceZones = await service.updateServiceZones(
              updateData
            )

            expect(updatedServiceZones).toHaveLength(2)

            for (const data_ of updateData) {
              const expectedServiceZone = updatedServiceZones.find(
                (serviceZone) => serviceZone.id === data_.id
              )
              expect(expectedServiceZone).toEqual(
                expect.objectContaining({
                  id: data_.id,
                  name: data_.name,
                  geo_zones: expect.arrayContaining([
                    expect.objectContaining({
                      type: (data_.geo_zones![0] as GeoZoneDTO).type,
                      country_code: (data_.geo_zones![0] as GeoZoneDTO)
                        .country_code,
                    }),
                  ]),
                })
              )
            }
          })

          it("should fail on duplicated service zone name", async function () {
            const fulfillmentSet = await service.create({
              name: "test",
              type: "test-type",
            })

            const createData: CreateServiceZoneDTO[] = [
              {
                name: "service-zone-test",
                fulfillment_set_id: fulfillmentSet.id,
                geo_zones: [
                  {
                    type: GeoZoneType.COUNTRY,
                    country_code: "fr",
                  },
                ],
              },
              {
                name: "service-zone-test2",
                fulfillment_set_id: fulfillmentSet.id,
                geo_zones: [
                  {
                    type: GeoZoneType.COUNTRY,
                    country_code: "us",
                  },
                ],
              },
            ]

            const createdServiceZones = await service.createServiceZones(
              createData
            )

            const updateData: UpdateServiceZoneDTO = {
              id: createdServiceZones[1].id,
              name: "service-zone-test",
              geo_zones: [
                {
                  type: GeoZoneType.COUNTRY,
                  country_code: "us",
                },
              ],
            }

            const err = await service
              .updateServiceZones(updateData)
              .catch((e) => e)

            expect(err).toBeDefined()
            expect(err.constraint).toBe("IDX_service_zone_name_unique")
          })
        })
      })
    })
  },
})
