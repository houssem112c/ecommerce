import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create test user
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      password: hashedPassword,
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1234567890',
      address: '123 Main St',
      city: 'New York',
      country: 'USA',
      zipCode: '10001',
    },
  });

  // Create cart for user
  await prisma.cart.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
    },
  });

  console.log('✅ User created:', user.email);

  // Create products
  const products = [
    {
      name: 'Wireless Headphones',
      description: 'High-quality wireless headphones with noise cancellation',
      price: 99.99,
      stock: 50,
      category: 'Electronics',
      imageUrl: 'https://via.placeholder.com/300x300?text=Headphones',
    },
    {
      name: 'Smartphone',
      description: 'Latest model smartphone with advanced features',
      price: 699.99,
      stock: 30,
      category: 'Electronics',
      imageUrl: 'https://via.placeholder.com/300x300?text=Smartphone',
    },
    {
      name: 'Laptop',
      description: 'Powerful laptop for work and gaming',
      price: 1299.99,
      stock: 20,
      category: 'Electronics',
      imageUrl: 'https://via.placeholder.com/300x300?text=Laptop',
    },
    {
      name: 'Running Shoes',
      description: 'Comfortable running shoes for daily exercise',
      price: 79.99,
      stock: 100,
      category: 'Sports',
      imageUrl: 'https://via.placeholder.com/300x300?text=Running+Shoes',
    },
    {
      name: 'Coffee Maker',
      description: 'Automatic coffee maker with programmable timer',
      price: 49.99,
      stock: 75,
      category: 'Home & Kitchen',
      imageUrl: 'https://via.placeholder.com/300x300?text=Coffee+Maker',
    },
    {
      name: 'Backpack',
      description: 'Durable backpack with multiple compartments',
      price: 39.99,
      stock: 150,
      category: 'Accessories',
      imageUrl: 'https://via.placeholder.com/300x300?text=Backpack',
    },
    {
      name: 'Smart Watch',
      description: 'Fitness tracker with heart rate monitor',
      price: 199.99,
      stock: 60,
      category: 'Electronics',
      imageUrl: 'https://via.placeholder.com/300x300?text=Smart+Watch',
    },
    {
      name: 'Yoga Mat',
      description: 'Non-slip yoga mat for home workouts',
      price: 29.99,
      stock: 200,
      category: 'Sports',
      imageUrl: 'https://via.placeholder.com/300x300?text=Yoga+Mat',
    },
    {
      name: 'Desk Lamp',
      description: 'LED desk lamp with adjustable brightness',
      price: 34.99,
      stock: 80,
      category: 'Home & Kitchen',
      imageUrl: 'https://via.placeholder.com/300x300?text=Desk+Lamp',
    },
    {
      name: 'Water Bottle',
      description: 'Insulated water bottle keeps drinks cold for 24 hours',
      price: 24.99,
      stock: 120,
      category: 'Sports',
      imageUrl: 'https://via.placeholder.com/300x300?text=Water+Bottle',
    },
  ];

  for (const product of products) {
    await prisma.product.create({
      data: product,
    });
  }

  console.log('✅ Products created:', products.length);
  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
