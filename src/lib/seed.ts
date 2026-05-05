import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('Seeding database...');

  // Create admin
  const adminPw = await bcrypt.hash('Admin@1234', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@propertysmart.com' },
    update: {},
    create: { name: 'Admin User', email: 'admin@propertysmart.com', password: adminPw, role: 'ADMIN', isVerified: true },
  });

  // Create agent
  const agentPw = await bcrypt.hash('Agent@1234', 12);
  const agent = await prisma.user.upsert({
    where: { email: 'agent@propertysmart.com' },
    update: {},
    create: { name: 'John Agent', email: 'agent@propertysmart.com', password: agentPw, role: 'AGENT', isVerified: true, phone: '+1-555-0101' },
  });

  // Create buyer
  const buyerPw = await bcrypt.hash('Buyer@1234', 12);
  await prisma.user.upsert({
    where: { email: 'buyer@propertysmart.com' },
    update: {},
    create: { name: 'Jane Buyer', email: 'buyer@propertysmart.com', password: buyerPw, role: 'BUYER', isVerified: true },
  });

  // Create sample properties
  const properties = [
    { title: 'Modern Downtown Condo', description: 'Luxurious condo in the heart of downtown with stunning city views, floor-to-ceiling windows, and premium finishes.', price: 450000, type: 'CONDO' as const, address: '123 Main St', city: 'New York', state: 'NY', zipCode: '10001', bedrooms: 2, bathrooms: 2, area: 1200, features: ['City View', 'Gym', 'Doorman', 'Rooftop Terrace'], images: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800'], isFeatured: true },
    { title: 'Suburban Family House', description: 'Spacious family home in a quiet neighborhood with a large backyard, updated kitchen, and excellent school district.', price: 680000, type: 'HOUSE' as const, address: '456 Oak Ave', city: 'Austin', state: 'TX', zipCode: '73301', bedrooms: 4, bathrooms: 3, area: 2800, features: ['Backyard', 'Garage', 'Fireplace', 'Updated Kitchen'], images: ['https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800'], isFeatured: true },
    { title: 'Beachfront Apartment', description: 'Wake up to ocean views in this stunning beachfront apartment with private balcony and resort-style amenities.', price: 325000, type: 'APARTMENT' as const, address: '789 Ocean Dr', city: 'Miami', state: 'FL', zipCode: '33101', bedrooms: 1, bathrooms: 1, area: 850, features: ['Ocean View', 'Pool', 'Beach Access', 'Balcony'], images: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'], isFeatured: true },
    { title: 'Historic Townhouse', description: 'Beautifully restored Victorian townhouse with original character details, private garden, and modern updates.', price: 895000, type: 'TOWNHOUSE' as const, address: '321 Heritage Lane', city: 'Boston', state: 'MA', zipCode: '02101', bedrooms: 3, bathrooms: 2.5, area: 2100, features: ['Garden', 'Fireplace', 'Exposed Brick', 'Parking'], images: ['https://images.unsplash.com/photo-1605276373954-0c4a0dac5b12?w=800'], isFeatured: false },
    { title: 'Mountain View Cabin', description: 'Cozy mountain retreat with breathtaking views, hot tub, and ski-in/ski-out access. Perfect for year-round enjoyment.', price: 520000, type: 'HOUSE' as const, address: '555 Alpine Rd', city: 'Denver', state: 'CO', zipCode: '80201', bedrooms: 3, bathrooms: 2, area: 1600, features: ['Mountain View', 'Hot Tub', 'Ski Access', 'Fireplace'], images: ['https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800'], isFeatured: true },
    { title: 'Downtown Studio Apartment', description: 'Chic studio apartment perfect for urban professionals. Walking distance to restaurants, shops, and public transit.', price: 185000, type: 'APARTMENT' as const, address: '88 City Center Blvd', city: 'Chicago', state: 'IL', zipCode: '60601', bedrooms: 0, bathrooms: 1, area: 550, features: ['City View', 'Gym', 'Rooftop', 'Pet Friendly'], images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'], isFeatured: false },
  ];

  for (const prop of properties) {
    await prisma.property.create({ data: { ...prop, agentId: agent.id } });
  }

  console.log('Seed completed.');
  console.log('\nTest accounts:');
  console.log('Admin:  admin@propertysmart.com / Admin@1234');
  console.log('Agent:  agent@propertysmart.com / Agent@1234');
  console.log('Buyer:  buyer@propertysmart.com / Buyer@1234');
}

main().catch(console.error).finally(() => prisma.$disconnect());
