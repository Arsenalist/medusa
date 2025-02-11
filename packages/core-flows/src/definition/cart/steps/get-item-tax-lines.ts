import {
  CartLineItemDTO,
  CartShippingMethodDTO,
  CartWorkflowDTO,
  ITaxModuleService,
  ItemTaxLineDTO,
  ShippingTaxLineDTO,
  TaxCalculationContext,
  TaxableItemDTO,
  TaxableShippingDTO,
} from "@medusajs/types"
import { StepResponse, createStep } from "@medusajs/workflows-sdk"
import { ModuleRegistrationName } from "../../../../../modules-sdk/dist"

interface StepInput {
  cart: CartWorkflowDTO
  items: CartLineItemDTO[]
  shipping_methods: CartShippingMethodDTO[]
}

function normalizeTaxModuleContext(
  cart: CartWorkflowDTO
): TaxCalculationContext | null {
  const address = cart.shipping_address

  if (!address || !address.country_code) {
    return null
  }

  let customer = cart.customer
    ? {
        id: cart.customer.id,
        email: cart.customer.email,
        customer_groups: cart.customer.groups?.map((g) => g.id) || [],
      }
    : undefined

  return {
    address: {
      country_code: address.country_code,
      province_code: address.province,
      address_1: address.address_1,
      address_2: address.address_2,
      city: address.city,
      postal_code: address.postal_code,
    },
    customer,
    // TODO: Should probably come in from order module, defaulting to false
    is_return: false,
  }
}

function normalizeLineItemsForTax(
  cart: CartWorkflowDTO,
  items: CartLineItemDTO[]
): TaxableItemDTO[] {
  return items.map((item) => ({
    id: item.id,
    product_id: item.product_id!,
    product_name: item.variant_title,
    product_sku: item.variant_sku,
    product_type: item.product_type,
    product_type_id: item.product_type,
    quantity: item.quantity,
    unit_price: item.unit_price,
    currency_code: cart.currency_code,
  }))
}

function normalizeLineItemsForShipping(
  cart: CartWorkflowDTO,
  shippingMethods: CartShippingMethodDTO[]
): TaxableShippingDTO[] {
  return shippingMethods.map((shippingMethod) => ({
    id: shippingMethod.id,
    shipping_option_id: shippingMethod.shipping_option_id!,
    unit_price: shippingMethod.amount,
    currency_code: cart.currency_code,
  }))
}

export const getItemTaxLinesStepId = "get-item-tax-lines"
export const getItemTaxLinesStep = createStep(
  getItemTaxLinesStepId,
  async (data: StepInput, { container }) => {
    const { cart, items, shipping_methods: shippingMethods } = data
    const taxService = container.resolve<ITaxModuleService>(
      ModuleRegistrationName.TAX
    )

    const taxContext = normalizeTaxModuleContext(cart)

    if (!taxContext) {
      return new StepResponse({
        lineItemTaxLines: [],
        shippingMethodsTaxLines: [],
      })
    }

    const lineItemTaxLines = (await taxService.getTaxLines(
      normalizeLineItemsForTax(cart, items),
      taxContext
    )) as ItemTaxLineDTO[]

    const shippingMethodsTaxLines = (await taxService.getTaxLines(
      normalizeLineItemsForShipping(cart, shippingMethods),
      taxContext
    )) as ShippingTaxLineDTO[]

    return new StepResponse({
      lineItemTaxLines,
      shippingMethodsTaxLines,
    })
  }
)
