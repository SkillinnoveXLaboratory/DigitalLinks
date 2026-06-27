const assert = require('assert');
const { renderQuotationHtml, parseQuotationPrompt } = require('./quotation-engine');

const prompts = [
  {
    name: 'Full numbered mobile app quotation',
    text: `Quotation - Catering Service Mobile Application

(Android App + iOS App + Vendor Panel + Admin Panel)

1. Project Overview
Development of a catering service mobile application where users can explore and book regional catering services.

2. Platform Includes
Customer Mobile Application (Android)
Customer Mobile Application (iOS)
Vendor Panel
Admin Panel

3. System Workflow
Step 1 - User Access
Users can:
Register / login
Search catering services

Step 2 - Booking
Users can:
Request booking
Select date

4. App Features
Users can:
Search caterers
View menus
Book services

Vendors can:
Manage services
Track bookings

5. Core Modules
User authentication system
Vendor management system
Booking system

6. Additional Features
Location-based search
Clean UI/UX

7. Technology Stack
Frontend: Flutter
Backend: Node.js
Database: MongoDB

8. Development Charges
Total Development Cost: ₹46,000

9. Work Duration
25 - 30 Working Days

10. Payment Structure
50% Advance Payment
50% Balance Payment

11. Cloud Hosting Services
₹700 per month

12. Additional Charges
Payment gateway charges
SMS / OTP charges

13. Exclusions
App publishing charges`
  },
  {
    name: 'Website only quotation',
    text: `Quotation - Corporate Website Development

1. Project Overview
Design and development of a responsive company website.

2. Platform Includes
Website
Admin CMS

3. System Workflow
Step 1 - Visitor Access
Users can:
Browse pages
Submit inquiry form

4. App Features
Website:
Home page
About page
Contact form

5. Core Modules
CMS management
Lead capture

7. Technology Stack
Frontend: HTML CSS JavaScript
Backend: Node.js

8. Development Charges
Total Development Cost: Rs 18,000`
  },
  {
    name: 'Unnumbered headings with bullets',
    text: `Quotation - Grocery Delivery App

Platform Includes
- Android App
- iOS App
- Admin Panel

Project Overview
- Grocery ordering application for customers and store owners.

System Workflow
Step 1 - Customer Login
Customers can:
- Login
- Search products
Step 2 - Store Panel
Vendors can:
- Add products
- Process orders

App Features
Customers can:
- Add to cart
- Pay online
Vendors can:
- Update stock

Development Charges
Total Development Cost: ₹75,000`
  },
  {
    name: 'PDF style copied text with broken spacing',
    text: `Quotation - Salon Booking System

1.Project Overview
Salon appointment booking application for customers and salon staff.

2.Platform Includes
Android App
iOS App
Staff Panel
Admin Panel

3.System Workflow
Step 1 – Booking
Users can:
Choose salon
Select slot

Step 2 – Staff Action
Staff can:
Accept appointment
Mark completed

8.Development Charges
Salon Booking System
Total Development Cost: Rs. 52,000

9.Work Duration
Estimated Timeline:
20 - 25 Working Days`
  },
  {
    name: 'Feature groups without workflow',
    text: `Quotation - Learning Management Platform

Project Overview
Online LMS where students can buy courses and teachers can upload lessons.

Platform Includes
Student App
Teacher Panel
Admin Panel

App Features
Students can:
Register
Buy course
Watch lessons
Teachers can:
Upload courses
Track students
Admin can:
Approve courses
Manage payments

Development Charges
Total Development Cost: ₹88,000`
  },
  {
    name: 'Minimal short prompt',
    text: `Quotation - Restaurant Website and Ordering App
Description
Restaurant website and food ordering mobile app.
Platforms
Website
Android App
Admin Panel
Features
Users can:
View menu
Place order
Admin can:
Manage menu
View orders
Cost
Total Cost: Rs 35,000
Timeline
15 - 20 Working Days`
  },
  {
    name: 'Ecommerce detailed terms',
    text: `Quotation - Ecommerce Mobile Application

(Android App + iOS App + Seller Panel + Admin Panel)

1. Project Overview
Multi-seller ecommerce application with product listing, cart, checkout, order tracking, and admin controls.

2. Platform Includes
Android App
iOS App
Seller Panel
Admin Panel

3. System Workflow
Step 1 - Shopping
Users can:
Browse products
Add to cart
Checkout

Step 2 - Seller Management
Sellers can:
Add products
Manage orders

Step 3 - Admin Management
Admin can:
Approve sellers
Monitor orders

4. App Features
Users can:
Login
Buy products
Track orders
Sellers can:
Manage catalogue
Admin can:
Manage platform

5. Core Modules
Product management
Order management
Payment integration

6. Additional Features
Coupon system
Push notifications

7. Technology Stack
Frontend: Flutter
Backend: Node.js
Database: MongoDB

8. Development Charges
Total Development Cost: ₹1,20,000

10. Payment Structure
40% Advance
30% After UI
30% Before Delivery

12. Additional Charges
Payment gateway fee

13. Exclusions
Inventory hardware
Marketplace legal compliance`
  }
];

prompts.forEach((prompt, index) => {
  const parsed = parseQuotationPrompt(prompt.text);
  const { html } = renderQuotationHtml(prompt.text);

  assert(parsed.projectTitle, `${prompt.name}: title missing`);
  assert(parsed.platforms.length, `${prompt.name}: platforms missing`);
  assert(parsed.featureGroups.length, `${prompt.name}: features missing`);
  assert(parsed.workflowSteps.length, `${prompt.name}: workflow missing`);
  assert(!html.includes('{{'), `${prompt.name}: unreplaced placeholder`);
  assert(html.includes('document-paper'), `${prompt.name}: simple document markup missing`);
  assert(html.includes('document-section-heading'), `${prompt.name}: section heading markup missing`);
  assert(/Total Development Cost|Total Cost/i.test(html), `${prompt.name}: cost section missing`);

  console.log(`Stage ${index + 1} passed: ${prompt.name}`);
});

const markdownPrompt = `# Quotation - Dating Mobile Application

(Android App + iOS App + Admin Dashboard)

---

## 1. Project Overview

Development of a dating mobile application for profile discovery, matching, chat, and calling.

## 8. Development Charges

### Dating Mobile Application

Total Development Cost: **Rs 1,15,000**`;

const { html: markdownHtml } = renderQuotationHtml(markdownPrompt);

assert(!markdownHtml.includes('## 1. Project Overview'), 'Markdown heading tokens should be removed');
assert(!markdownHtml.includes('**Rs 1,15,000**'), 'Markdown bold markers should be removed');
assert(markdownHtml.includes('document-amount'), 'Markdown total cost should render as a highlighted amount');

const parserEdgeCases = [
  {
    name: 'Split-line cost and timeline',
    text: `Quotation - Sample App

8. Development Charges
Total Development Cost
Rs 55000

9. Work Duration
Estimated Timeline
30 - 45 Working Days`,
    expectedCost: 'Rs 55000',
    expectedDuration: '30 - 45 Working Days'
  },
  {
    name: 'Markdown summary labels',
    text: `# Quotation - Sample App

## Development Charges
Project Budget: **Rs 95,000**

## Timeline
**60 Days**`,
    expectedCost: 'Rs 95,000',
    expectedDuration: '60 Days'
  },
  {
    name: 'Summary block fallback scan',
    text: `Quotation - Sample App

Project Summary
Development Cost: Rs 125000
Timeline: 40 - 50 Working Days`,
    expectedCost: 'Rs 125000',
    expectedDuration: '40 - 50 Working Days'
  }
];

parserEdgeCases.forEach((testCase) => {
  const parsed = parseQuotationPrompt(testCase.text);
  assert.strictEqual(parsed.developmentCharges.totalCost, testCase.expectedCost, `${testCase.name}: cost detection failed`);
  assert.strictEqual(parsed.duration[0], testCase.expectedDuration, `${testCase.name}: duration detection failed`);
});

console.log('Cost and timeline fallback verification passed.');
console.log('Markdown cleanup verification passed.');
console.log('All 7 prompt recognition stages passed.');
