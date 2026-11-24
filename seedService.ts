import bcrypt from 'bcryptjs';
import { count, eq } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import {
  categories,
  coupons,
  inventoryLogs,
  productImages,
  products,
  productVariants,
  storeSettings,
  users,
} from '../../db/schema.ts';
import { env } from '../config/env.ts';

let seedPromise: Promise<void> | null = null;

export async function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = runSeed().catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  return seedPromise;
}

async function runSeed(): Promise<void> {
  // Ensure default store settings exist
  const [{ value: settingsCount }] = await db.select({ value: count() }).from(storeSettings);
  if (Number(settingsCount) === 0) {
    await db.insert(storeSettings).values({
      storeName: 'NEXORA',
      supportEmail: 'concierge@nexora.store',
      supportPhone: '+1 (800) 555-0194',
      storeAddress: '880 Obsidian Way, Suite 400, Singapore',
      shippingFlatFee: '15.00',
      freeShippingThreshold: '250.00',
      codEnabled: true,
      onlinePaymentEnabled: true,
    });
  }

  // If ADMIN_EMAIL and ADMIN_PASSWORD are configured via env, ensure that admin account exists
  if (env.adminEmail && env.adminPassword) {
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.email, env.adminEmail))
      .limit(1);

    if (!existingAdmin[0]) {
      const passwordHash = await bcrypt.hash(env.adminPassword, 12);
      await db.insert(users).values({
        email: env.adminEmail,
        name: 'NEXORA Administrator',
        passwordHash,
        role: 'admin',
      });
    }
  }

  // Seed categories and products only when catalog is empty
  const [{ value: catCount }] = await db.select({ value: count() }).from(categories);
  if (Number(catCount) > 0) return;

  const insertedCategories = await db
    .insert(categories)
    .values([
      {
        name: 'Audio Systems',
        slug: 'audio-systems',
        description: 'Planar magnetic headphones, reference DACs, and spatial room acoustics.',
        imageUrl: '/src/assets/images/category_audio_1795543902665.jpg',
      },
      {
        name: 'Wearable Optics',
        slug: 'wearable-optics',
        description: 'Grade-5 titanium chronographs and lightweight augmented optical frames.',
        imageUrl: '/src/assets/images/category_wearables_1795543903312.jpg',
      },
      {
        name: 'Precision Computing',
        slug: 'precision-computing',
        description: 'CNC-milled input instruments, Thunderbolt docks, and OLED reference displays.',
        imageUrl: '/src/assets/images/category_computing_1795543904058.jpg',
      },
    ])
    .returning();

  const catMap = new Map(insertedCategories.map((c) => [c.slug, c.id]));

  const seedProducts: Array<{
    categorySlug: string;
    name: string;
    slug: string;
    description: string;
    specifications: Record<string, string>;
    price: string;
    compareAtPrice: string | null;
    stock: number;
    sku: string;
    isFeatured: boolean;
    isNewArrival: boolean;
    isBestSeller: boolean;
    ratingAvg: string;
    reviewCount: number;
    images: Array<{ url: string; altText: string; isPrimary: boolean }>;
    variants: Array<{
      name: string;
      sku: string;
      priceDelta: string;
      stock: number;
      attributes: Record<string, string>;
    }>;
  }> = [
    {
      categorySlug: 'audio-systems',
      name: 'Aether X1 Spatial Headphones',
      slug: 'aether-x1-spatial-headphones',
      description:
        'Closed-back planar magnetic wireless headphones machined from bead-blasted anodized aluminum and memory lambskin. Engineered for 40kHz studio resolution with adaptive hybrid acoustic cancellation and zero-latency lossless USB-C audio.',
      specifications: {
        Drivers: '50mm Planar Magnetic Transducers',
        Frequency: '10Hz – 40,000Hz',
        Battery: '48 Hours ANC Active',
        Connectivity: 'Bluetooth 5.4 / Lossless USB-C / 4.4mm Balanced',
        Weight: '318g',
      },
      price: '449.00',
      compareAtPrice: '499.00',
      stock: 28,
      sku: 'NX-AUD-AX1',
      isFeatured: true,
      isNewArrival: true,
      isBestSeller: true,
      ratingAvg: '4.90',
      reviewCount: 42,
      images: [
        {
          url: '/src/assets/images/product_aether_headphones_1795543899726.jpg',
          altText: 'Aether X1 Spatial Headphones in Matte Obsidian',
          isPrimary: true,
        },
        {
          url: '/src/assets/images/hero_nexora_flagship_1795543900002.jpg',
          altText: 'Aether X1 paired with desktop reference DAC',
          isPrimary: false,
        },
      ],
      variants: [
        { name: 'Obsidian Matte', sku: 'NX-AUD-AX1-OBS', priceDelta: '0.00', stock: 18, attributes: { Finish: 'Obsidian Matte' } },
        { name: 'Brushed Titanium', sku: 'NX-AUD-AX1-TIT', priceDelta: '30.00', stock: 10, attributes: { Finish: 'Brushed Titanium' } },
      ],
    },
    {
      categorySlug: 'audio-systems',
      name: 'Pulse Monolith Studio Speaker',
      slug: 'pulse-monolith-studio-speaker',
      description:
        'Omnidirectional acoustic cylinder milled from solid matte-black composite with a 360-degree CNC perforated aluminum waveguide and room-calibrating DSP.',
      specifications: {
        Amplification: '240W Class-D Tri-Amped',
        Drivers: '5.25" Down-Firing Woofer + 3 Tweeters',
        Connectivity: 'Wi-Fi 6E / AirPlay / Optical / USB-C',
        Chassis: 'CNC Bead-Blasted Aluminum & Acoustic Polymer',
      },
      price: '329.00',
      compareAtPrice: null,
      stock: 19,
      sku: 'NX-AUD-PLS',
      isFeatured: true,
      isNewArrival: false,
      isBestSeller: true,
      ratingAvg: '4.80',
      reviewCount: 27,
      images: [
        {
          url: '/src/assets/images/product_pulse_speaker_1795543901921.jpg',
          altText: 'Pulse Monolith Studio Speaker',
          isPrimary: true,
        },
      ],
      variants: [
        { name: 'Single Unit', sku: 'NX-AUD-PLS-1', priceDelta: '0.00', stock: 14, attributes: { Configuration: 'Single Unit' } },
        { name: 'Stereo Pair', sku: 'NX-AUD-PLS-2', priceDelta: '299.00', stock: 5, attributes: { Configuration: 'Stereo Pair' } },
      ],
    },
    {
      categorySlug: 'wearable-optics',
      name: 'Kronos Ti-4 Titanium Chronograph',
      slug: 'kronos-ti-4-titanium-chronograph',
      description:
        'Grade-5 brushed titanium smart chronograph featuring dual-layer sapphire crystal, micro-OLED telemetry indices, ECG biometric sensors, and 14-day autonomous battery endurance.',
      specifications: {
        Case: '44mm Grade-5 Brushed Titanium',
        Crystal: 'Domed Sapphire with AR Coating',
        WaterResistance: '100m / 10 ATM',
        Endurance: '14 Days Typical Use',
      },
      price: '589.00',
      compareAtPrice: '649.00',
      stock: 14,
      sku: 'NX-WRB-KRN',
      isFeatured: true,
      isNewArrival: true,
      isBestSeller: true,
      ratingAvg: '4.95',
      reviewCount: 31,
      images: [
        {
          url: '/src/assets/images/product_kronos_watch_1795543900574.jpg',
          altText: 'Kronos Ti-4 Titanium Chronograph',
          isPrimary: true,
        },
        {
          url: '/src/assets/images/category_wearables_1795543903312.jpg',
          altText: 'Kronos wearable lineup on basalt',
          isPrimary: false,
        },
      ],
      variants: [
        { name: '44mm Titanium Link', sku: 'NX-WRB-KRN-44L', priceDelta: '0.00', stock: 9, attributes: { Strap: 'Titanium Link' } },
        { name: '44mm Fluoroelastomer', sku: 'NX-WRB-KRN-44F', priceDelta: '-40.00', stock: 5, attributes: { Strap: 'Obsidian Sport' } },
      ],
    },
    {
      categorySlug: 'wearable-optics',
      name: 'Axon Optical HUD Frames',
      slug: 'axon-optical-hud-frames',
      description:
        'Featherweight 34-gram titanium optical frames integrating micro-waveguide monochrome notification projection, directional open-ear acoustics, and prescription-ready cyan anti-reflective lenses.',
      specifications: {
        FrameMaterial: 'Beta-Titanium Alloy',
        Optics: 'Waveguide Micro-Display (1500 nits)',
        Weight: '34g',
        Battery: '16 Hours Continuous Standby',
      },
      price: '399.00',
      compareAtPrice: null,
      stock: 8,
      sku: 'NX-WRB-AXN',
      isFeatured: false,
      isNewArrival: true,
      isBestSeller: false,
      ratingAvg: '4.70',
      reviewCount: 15,
      images: [
        {
          url: '/src/assets/images/product_axon_glasses_1795543901895.jpg',
          altText: 'Axon Optical HUD Frames',
          isPrimary: true,
        },
      ],
      variants: [
        { name: 'Gunmetal / Clear AR', sku: 'NX-WRB-AXN-CLR', priceDelta: '0.00', stock: 5, attributes: { Lens: 'Clear AR' } },
        { name: 'Gunmetal / Polarized Sun', sku: 'NX-WRB-AXN-SUN', priceDelta: '25.00', stock: 3, attributes: { Lens: 'Polarized Sun' } },
      ],
    },
    {
      categorySlug: 'precision-computing',
      name: 'Lumina 75 CNC Mechanical Keyboard',
      slug: 'lumina-75-cnc-mechanical-keyboard',
      description:
        'Gasket-mounted 75% mechanical instrument milled from a solid billet of 6063 aluminum. Equipped with factory-lubed linear Hall-effect magnetic switches, smoky polycarbonate keycaps, and QMK/VIA programmability.',
      specifications: {
        Chassis: 'CNC 6063 Anodized Aluminum',
        Switches: 'Hot-Swap Magnetic Hall-Effect (0.1mm actuation)',
        Keycaps: 'Smoky Translucent PBT / Polycarbonate',
        PollingRate: '8000Hz Wired / 4000Hz 2.4GHz',
      },
      price: '269.00',
      compareAtPrice: '299.00',
      stock: 34,
      sku: 'NX-CMP-LUM',
      isFeatured: true,
      isNewArrival: false,
      isBestSeller: true,
      ratingAvg: '4.88',
      reviewCount: 64,
      images: [
        {
          url: '/src/assets/images/product_lumina_keyboard_1795543901097.jpg',
          altText: 'Lumina 75 CNC Mechanical Keyboard',
          isPrimary: true,
        },
        {
          url: '/src/assets/images/category_computing_1795543904058.jpg',
          altText: 'Lumina keyboard workstation setup',
          isPrimary: false,
        },
      ],
      variants: [
        { name: 'Linear Magnetic (45g)', sku: 'NX-CMP-LUM-LIN', priceDelta: '0.00', stock: 22, attributes: { Switch: 'Linear 45g' } },
        { name: 'Tactile Silent (55g)', sku: 'NX-CMP-LUM-TAC', priceDelta: '15.00', stock: 12, attributes: { Switch: 'Tactile 55g' } },
      ],
    },
    {
      categorySlug: 'precision-computing',
      name: 'Vortex Forged Carbon Mouse',
      slug: 'vortex-forged-carbon-mouse',
      description:
        '42-gram forged carbon-composite wireless precision mouse featuring a 30,000 DPI optical sensor, optical microswitches, and magnesium-alloy scroll wheel.',
      specifications: {
        Shell: 'Forged Carbon-Fiber Composite',
        Weight: '42g',
        Sensor: 'PAW3950 Pro 30,000 DPI',
        Polling: '8000Hz Wireless Dongle Included',
      },
      price: '159.00',
      compareAtPrice: null,
      stock: 41,
      sku: 'NX-CMP-VTX',
      isFeatured: false,
      isNewArrival: true,
      isBestSeller: true,
      ratingAvg: '4.85',
      reviewCount: 53,
      images: [
        {
          url: '/src/assets/images/product_vortex_mouse_1795543901991.jpg',
          altText: 'Vortex Forged Carbon Mouse',
          isPrimary: true,
        },
      ],
      variants: [
        { name: 'Forged Carbon Matte', sku: 'NX-CMP-VTX-FC', priceDelta: '0.00', stock: 41, attributes: { Shell: 'Forged Carbon' } },
      ],
    },
    {
      categorySlug: 'precision-computing',
      name: 'Solaris Thunderbolt 5 Workstation Dock',
      slug: 'solaris-thunderbolt-5-workstation-dock',
      description:
        '16-port CNC gunmetal Thunderbolt 5 hub with integrated 15W Qi2 vertical magnetic phone dock, 140W host power delivery, dual 8K display support, and 2.5GbE networking.',
      specifications: {
        Upstream: 'Thunderbolt 5 (120Gbps Bandwidth, 140W PD)',
        Ports: '3x TB5, 3x USB-A 10Gbps, HDMI 2.1, 2.5GbE, SD 4.0',
        ChargingDock: 'Integrated 15W Qi2 Magnetic Stand',
      },
      price: '289.00',
      compareAtPrice: '320.00',
      stock: 6,
      sku: 'NX-CMP-SOL',
      isFeatured: false,
      isNewArrival: true,
      isBestSeller: false,
      ratingAvg: '4.75',
      reviewCount: 19,
      images: [
        {
          url: '/src/assets/images/product_solaris_dock_1795543902578.jpg',
          altText: 'Solaris Thunderbolt 5 Workstation Dock',
          isPrimary: true,
        },
      ],
      variants: [
        { name: 'Space Gunmetal 140W', sku: 'NX-CMP-SOL-140', priceDelta: '0.00', stock: 6, attributes: { Power: '140W' } },
      ],
    },
    {
      categorySlug: 'precision-computing',
      name: 'Spectra 32 OLED Reference Display',
      slug: 'spectra-32-oled-reference-display',
      description:
        '32-inch 4K QD-OLED studio reference monitor with 240Hz refresh rate, 99.3% DCI-P3 factory color calibration, and a counterbalanced sculpted brushed-aluminum stand.',
      specifications: {
        Panel: '31.5" 4K (3840x2160) QD-OLED, 240Hz',
        ColorAccuracy: 'Delta E < 1, 99.3% DCI-P3',
        Inputs: 'Thunderbolt 4 (98W PD), 2x HDMI 2.1, DP 2.1',
      },
      price: '1299.00',
      compareAtPrice: '1449.00',
      stock: 5,
      sku: 'NX-CMP-SPC',
      isFeatured: true,
      isNewArrival: false,
      isBestSeller: false,
      ratingAvg: '4.92',
      reviewCount: 12,
      images: [
        {
          url: '/src/assets/images/product_spectra_monitor_1795543902581.jpg',
          altText: 'Spectra 32 OLED Reference Display',
          isPrimary: true,
        },
      ],
      variants: [
        { name: 'Standard Glass', sku: 'NX-CMP-SPC-STD', priceDelta: '0.00', stock: 3, attributes: { Coating: 'Glossy AR' } },
        { name: 'Nano-Etched Matte', sku: 'NX-CMP-SPC-MAT', priceDelta: '120.00', stock: 2, attributes: { Coating: 'Nano Matte' } },
      ],
    },
  ];

  for (const item of seedProducts) {
    const categoryId = catMap.get(item.categorySlug)!;
    const [createdProduct] = await db
      .insert(products)
      .values({
        categoryId,
        name: item.name,
        slug: item.slug,
        description: item.description,
        specifications: item.specifications,
        price: item.price,
        compareAtPrice: item.compareAtPrice,
        stock: item.stock,
        sku: item.sku,
        status: 'active',
        isFeatured: item.isFeatured,
        isNewArrival: item.isNewArrival,
        isBestSeller: item.isBestSeller,
        ratingAvg: item.ratingAvg,
        reviewCount: item.reviewCount,
      })
      .returning();

    if (item.images.length > 0) {
      await db.insert(productImages).values(
        item.images.map((img, idx) => ({
          productId: createdProduct.id,
          url: img.url,
          altText: img.altText,
          isPrimary: img.isPrimary,
          sortOrder: idx,
        }))
      );
    }

    if (item.variants.length > 0) {
      await db.insert(productVariants).values(
        item.variants.map((v) => ({
          productId: createdProduct.id,
          name: v.name,
          sku: v.sku,
          priceDelta: v.priceDelta,
          stock: v.stock,
          attributes: v.attributes,
        }))
      );
    }

    await db.insert(inventoryLogs).values({
      productId: createdProduct.id,
      changeAmount: item.stock,
      previousStock: 0,
      newStock: item.stock,
      reason: 'Initial catalog allocation',
    });
  }

  await db.insert(coupons).values([
    {
      code: 'NEXORA10',
      discountType: 'percentage',
      discountValue: '10.00',
      minOrderAmount: '100.00',
      maxUsage: 500,
      isActive: true,
    },
    {
      code: 'WELCOME25',
      discountType: 'fixed',
      discountValue: '25.00',
      minOrderAmount: '200.00',
      maxUsage: 200,
      isActive: true,
    },
  ]);
}
