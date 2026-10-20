/* Seeds the database with demo accounts and past trips.
 * Run with: npm run db:seed
 * Password hashing MUST stay in sync with src/lib/auth.ts
 */
import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes } from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

const PLACES = {
  plateau: { lat: 45.5231, lng: -73.5807 },
  downtown: { lat: 45.5017, lng: -73.5673 },
  yul: { lat: 45.4706, lng: -73.7408 },
  oldMontreal: { lat: 45.5075, lng: -73.5541 },
  bellCentre: { lat: 45.4961, lng: -73.5694 },
  mileEnd: { lat: 45.5234, lng: -73.6025 },
  jeanTalon: { lat: 45.5363, lng: -73.6134 },
  verdun: { lat: 45.4541, lng: -73.5664 },
};

function buildFare({ base, perKm, perMin, km, min, airport = 0, surge = 1 }) {
  const raw = base + perKm * km + perMin * min;
  const subtotal = Math.round(raw * surge * 100) / 100 + airport;
  const taxes = Math.round(subtotal * 0.14975 * 100) / 100;
  const fare = Math.round((subtotal + taxes) * 100) / 100;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxes,
    fare,
    driverPayout: Math.round(subtotal * 0.78 * 100) / 100,
  };
}

async function main() {
  console.log("Seeding RideShare LLC database...");

  // Clean slate so the seed is idempotent.
  await prisma.ride.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.user.deleteMany();

  const password = hashPassword("montreal1");

  const emma = await prisma.user.create({
    data: {
      email: "emma@rideshare.ca",
      name: "Emma Tremblay",
      phone: "+1 (514) 555-0182",
      passwordHash: password,
      locale: "fr",
    },
  });
  await prisma.user.create({
    data: {
      email: "nathan@rideshare.ca",
      name: "Nathan Côté",
      phone: "+1 (514) 555-0134",
      passwordHash: password,
      locale: "en",
    },
  });

  const drivers = await Promise.all([
    prisma.user.create({
      data: {
        email: "marc@rideshare.ca",
        name: "Marc Lefebvre",
        phone: "+1 (514) 555-0110",
        passwordHash: password,
        locale: "fr",
        driver: {
          create: {
            carModel: "Toyota Camry",
            plate: "RDS-4821",
            color: "Graphite",
            rating: 4.93,
            online: true,
            lat: PLACES.plateau.lat,
            lng: PLACES.plateau.lng,
          },
        },
      },
      include: { driver: true },
    }),
    prisma.user.create({
      data: {
        email: "sophie@rideshare.ca",
        name: "Sophie Gagnon",
        phone: "+1 (438) 555-0177",
        passwordHash: password,
        locale: "fr",
        driver: {
          create: {
            carModel: "Honda Civic",
            plate: "RDS-7305",
            color: "Midnight Black",
            rating: 4.88,
            online: true,
            lat: PLACES.downtown.lat,
            lng: PLACES.downtown.lng,
          },
        },
      },
      include: { driver: true },
    }),
    prisma.user.create({
      data: {
        email: "jean@rideshare.ca",
        name: "Jean Bouchard",
        phone: "+1 (514) 555-0155",
        passwordHash: password,
        locale: "en",
        driver: {
          create: {
            carModel: "Subaru Outback",
            plate: "RDS-2198",
            color: "Deep Blue",
            rating: 4.96,
            online: true,
            lat: PLACES.yul.lat,
            lng: PLACES.yul.lng,
          },
        },
      },
      include: { driver: true },
    }),
    prisma.user.create({
      data: {
        email: "olivia@rideshare.ca",
        name: "Olivia Roy",
        phone: "+1 (438) 555-0129",
        passwordHash: password,
        locale: "fr",
        driver: {
          create: {
            carModel: "Toyota Sienna",
            plate: "RDS-6640",
            color: "Pearl White",
            rating: 4.91,
            online: true,
            lat: PLACES.verdun.lat,
            lng: PLACES.verdun.lng,
          },
        },
      },
      include: { driver: true },
    }),
  ]);

  // Completed trip history for Emma.
  const past = [
    {
      pickup: { id: "plateau", ...PLACES.plateau },
      dropoff: { id: "yul", ...PLACES.yul },
      tier: "economy",
      km: 18.9,
      min: 34,
      airport: 12,
      driverId: drivers[2].driver.id,
      daysAgo: 6,
      hoursAgo: 8,
      rating: 5,
    },
    {
      pickup: { id: "old-montreal", ...PLACES.oldMontreal },
      dropoff: { id: "bell-centre", ...PLACES.bellCentre },
      tier: "premium",
      km: 2.6,
      min: 11,
      airport: 0,
      driverId: drivers[1].driver.id,
      daysAgo: 3,
      hoursAgo: 19,
      rating: 5,
    },
    {
      pickup: { id: "mile-end", ...PLACES.mileEnd },
      dropoff: { id: "jean-talon", ...PLACES.jeanTalon },
      tier: "economy",
      km: 3.1,
      min: 12,
      airport: 0,
      driverId: drivers[0].driver.id,
      daysAgo: 1,
      hoursAgo: 11,
      rating: 4,
    },
  ];

  const rates = {
    economy: { base: 3.5, perKm: 1.85, perMin: 0.35 },
    premium: { base: 6.5, perKm: 2.95, perMin: 0.55 },
    xl: { base: 5.5, perKm: 2.4, perMin: 0.45 },
  };

  for (const trip of past) {
    const price = buildFare({ ...rates[trip.tier], km: trip.km, min: trip.min, airport: trip.airport });
    const start = new Date(Date.now() - trip.daysAgo * 86400000 - trip.hoursAgo * 3600000);
    const end = new Date(start.getTime() + trip.min * 60000);
    await prisma.ride.create({
      data: {
        riderId: emma.id,
        driverId: trip.driverId,
        status: "completed",
        tier: trip.tier,
        pickupId: trip.pickup.id,
        pickupName: trip.pickup.id,
        pickupLat: trip.pickup.lat,
        pickupLng: trip.pickup.lng,
        dropoffId: trip.dropoff.id,
        dropoffName: trip.dropoff.id,
        dropoffLat: trip.dropoff.lat,
        dropoffLng: trip.dropoff.lng,
        distanceKm: trip.km,
        durationMin: trip.min,
        baseFare: rates[trip.tier].base,
        distanceFare: Math.round(rates[trip.tier].perKm * trip.km * 100) / 100,
        timeFare: Math.round(rates[trip.tier].perMin * trip.min * 100) / 100,
        airportFee: trip.airport,
        surge: 1,
        subtotal: price.subtotal,
        taxes: price.taxes,
        fare: price.fare,
        driverPayout: price.driverPayout,
        paymentRef: `RDS-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
        rating: trip.rating,
        createdAt: start,
        updatedAt: end,
        matchedAt: start,
        startedAt: start,
        completedAt: end,
      },
    });
  }

  console.log("Seed complete.");
  console.log("Rider account:  emma@rideshare.ca  / montreal1");
  console.log("Driver account: marc@rideshare.ca / montreal1");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
