import { PrismaClient, ProductStatus, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Admin123!", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@brillar.com" },
    update: {},
    create: {
      email: "admin@brillar.com",
      name: "Admin User",
      passwordHash,
      role: Role.ADMIN
    }
  });

  // Seed FAQ data
  const faqData = [
    // Shipping & Delivery
    {
      question: "What are your shipping options?",
      answer: "We offer standard shipping (5-7 business days), express shipping (2-3 business days), and overnight shipping (next business day). Shipping costs vary based on the option you choose and your location. Free shipping is available on orders over $100.",
      category: "Shipping & Delivery",
      order: 1,
      isActive: true
    },
    {
      question: "How long does shipping take?",
      answer: "Standard shipping typically takes 5-7 business days. Express shipping takes 2-3 business days, and overnight shipping arrives the next business day. Please note that processing time (1-2 business days) is in addition to shipping time.",
      category: "Shipping & Delivery",
      order: 2,
      isActive: true
    },
    {
      question: "Do you ship internationally?",
      answer: "Yes, we ship to most countries worldwide. International shipping times vary by destination (typically 10-20 business days). Additional customs fees and import taxes may apply and are the responsibility of the customer.",
      category: "Shipping & Delivery",
      order: 3,
      isActive: true
    },
    {
      question: "How can I track my order?",
      answer: "Once your order ships, you'll receive a tracking number via email. You can use this tracking number on our website's order tracking page or on the carrier's website to monitor your package's progress.",
      category: "Shipping & Delivery",
      order: 4,
      isActive: true
    },
    {
      question: "What if my package is lost or damaged?",
      answer: "If your package is lost or arrives damaged, please contact our customer service team within 7 days of delivery. We'll investigate and either reship your order or provide a full refund. Please keep the original packaging for damaged items.",
      category: "Shipping & Delivery",
      order: 5,
      isActive: true
    },
    // Returns & Refunds
    {
      question: "What is your return policy?",
      answer: "We offer a 30-day return policy on most items. Items must be unused, in original packaging, and with tags attached. Some items like personalized products, undergarments, and sale items may be excluded. Please check the product page for specific return eligibility.",
      category: "Returns & Refunds",
      order: 1,
      isActive: true
    },
    {
      question: "How do I return an item?",
      answer: "To return an item, log into your account, go to 'My Orders', select the order you want to return, and click 'Return Item'. Follow the instructions to print a prepaid return label. Pack the item securely and drop it off at any authorized carrier location.",
      category: "Returns & Refunds",
      order: 2,
      isActive: true
    },
    {
      question: "How long does it take to process a refund?",
      answer: "Once we receive your returned item, we'll process your refund within 5-7 business days. The refund will be issued to your original payment method. It may take an additional 3-5 business days for the refund to appear in your account, depending on your bank or credit card company.",
      category: "Returns & Refunds",
      order: 3,
      isActive: true
    },
    {
      question: "Do you offer exchanges?",
      answer: "Yes, we offer exchanges for different sizes or colors of the same item. To exchange an item, please return the original item following our return process, then place a new order for the item you want. We'll process your return refund once we receive the original item.",
      category: "Returns & Refunds",
      order: 4,
      isActive: true
    },
    // Orders
    {
      question: "How do I place an order?",
      answer: "Browse our products, add items to your cart, and proceed to checkout. You'll need to create an account or sign in, enter your shipping address, select a payment method, and confirm your order. You'll receive an order confirmation email once your order is placed.",
      category: "Orders",
      order: 1,
      isActive: true
    },
    {
      question: "Can I modify or cancel my order?",
      answer: "You can modify or cancel your order within 1 hour of placing it by contacting customer service. Once your order has been processed and shipped, you'll need to use our return process if you want to return the item.",
      category: "Orders",
      order: 2,
      isActive: true
    },
    {
      question: "How do I check my order status?",
      answer: "Log into your account and go to 'My Orders' to view all your orders and their current status. You can also click on any order to see detailed information including tracking numbers and estimated delivery dates.",
      category: "Orders",
      order: 3,
      isActive: true
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards (Visa, Mastercard, American Express, Discover), PayPal, Apple Pay, Google Pay, and bank transfers for certain orders. All payments are processed securely through encrypted connections.",
      category: "Payment",
      order: 1,
      isActive: true
    },
    {
      question: "Is my payment information secure?",
      answer: "Yes, we use industry-standard SSL encryption to protect your payment information. We never store your full credit card details on our servers. All payment processing is handled by secure, PCI-compliant payment processors.",
      category: "Payment",
      order: 2,
      isActive: true
    },
    {
      question: "Do you charge sales tax?",
      answer: "Sales tax is calculated based on your shipping address and local tax laws. Tax will be displayed during checkout before you complete your purchase. Tax rates vary by state and country.",
      category: "Payment",
      order: 3,
      isActive: true
    },
    // Products
    {
      question: "How do I know what size to order?",
      answer: "Each product page includes a size guide with detailed measurements. We recommend measuring yourself and comparing to our size charts. If you're between sizes, we suggest sizing up. If you're unsure, our customer service team can help you find the right fit.",
      category: "Products",
      order: 1,
      isActive: true
    },
    {
      question: "Are your products authentic?",
      answer: "Yes, all our products are 100% authentic and sourced directly from authorized suppliers and manufacturers. We guarantee the authenticity of every item we sell and offer a full refund if you receive any counterfeit products.",
      category: "Products",
      order: 2,
      isActive: true
    },
    {
      question: "What if a product is out of stock?",
      answer: "If a product is out of stock, you can sign up for email notifications to be alerted when it becomes available again. We restock popular items regularly, and you'll receive an email as soon as your desired item is back in stock.",
      category: "Products",
      order: 3,
      isActive: true
    },
    {
      question: "Do you offer product warranties?",
      answer: "Most products come with a manufacturer's warranty. Warranty details are listed on individual product pages. If you have issues with a product under warranty, contact our customer service team and we'll help you process a warranty claim.",
      category: "Products",
      order: 4,
      isActive: true
    },
    // Account & Account Management
    {
      question: "How do I create an account?",
      answer: "Click 'Sign In' in the top right corner, then select 'Create Account'. Enter your email address, create a password, and provide your name. You'll receive a confirmation email to verify your account. Once verified, you can start shopping!",
      category: "Account",
      order: 1,
      isActive: true
    },
    {
      question: "I forgot my password. How do I reset it?",
      answer: "Click 'Sign In' and then 'Forgot Password'. Enter your email address and we'll send you a password reset link. Click the link in the email to create a new password. The link expires after 24 hours for security reasons.",
      category: "Account",
      order: 2,
      isActive: true
    },
    {
      question: "How do I update my account information?",
      answer: "Log into your account and go to 'My Account' or 'Profile Settings'. From there, you can update your name, email address, password, shipping addresses, and payment methods. Changes are saved immediately.",
      category: "Account",
      order: 3,
      isActive: true
    },
    // General
    {
      question: "How do I contact customer service?",
      answer: "You can reach our customer service team via email at support@brillarecommerce.com, by phone at +65 6123 4567, or through the live chat on our website (available Monday-Friday, 9 AM - 6 PM). We typically respond within 24 hours.",
      category: "General",
      order: 1,
      isActive: true
    },
    {
      question: "Do you have a physical store?",
      answer: "Currently, we operate as an online-only store. However, we're always looking to expand! Sign up for our newsletter to be notified if we open a physical location near you.",
      category: "General",
      order: 2,
      isActive: true
    },
    {
      question: "How do I unsubscribe from marketing emails?",
      answer: "You can unsubscribe from marketing emails by clicking the 'Unsubscribe' link at the bottom of any marketing email, or by updating your email preferences in your account settings. You'll still receive important order and account-related emails.",
      category: "General",
      order: 3,
      isActive: true
    },
    {
      question: "What is your privacy policy?",
      answer: "We take your privacy seriously. We only collect information necessary to process your orders and improve your shopping experience. We never sell your personal information to third parties. You can read our full privacy policy in the footer of our website.",
      category: "General",
      order: 4,
      isActive: true
    }
  ];

  // Create FAQs - delete existing and create new to avoid duplicates
  await prisma.faq.deleteMany({});
  
  for (const faq of faqData) {
    await prisma.faq.create({
      data: faq
    });
  }

  console.log(`Seeded ${faqData.length} FAQs`);
  console.log("Seeded admin", admin.email);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
