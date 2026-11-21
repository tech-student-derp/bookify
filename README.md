# 📚 Bookify

> **Read books, sell books, buy books, read books again.**

Bookify is an online book marketplace platform designed to connect book buyers and sellers in one convenient place. It supports new and pre-owned physical books, as well as digital e-books, providing users with an accessible platform to discover, purchase, and sell reading materials.

The platform acts as an intermediary between buyers and sellers, providing listing management, order processing, delivery coordination, and administrative oversight.

---

## 📖 Table of Contents

- [About the Project](#-about-the-project)
- [Key Features](#-key-features)
- [User Roles](#-user-roles)
- [Supported Products](#-supported-products)
- [Marketplace Workflow](#-marketplace-workflow)
- [Business Rules and Policies](#-business-rules-and-policies)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Installation and Setup](#-installation-and-setup)
- [Development Notes](#-development-notes)
- [Project Scope](#-project-scope)
- [Disclaimer](#-disclaimer)

---

## 📝 About the Project

Bookify is designed to make buying and selling books more accessible by providing a centralized marketplace for different types of reading materials.

Unlike traditional online bookstores that primarily sell their own inventory, Bookify follows a marketplace model where independent sellers can list their products and manage their own pricing.

The platform aims to provide:

- A convenient book-buying experience.
- Opportunities for individuals and independent sellers to sell books.
- Support for both physical and digital reading materials.
- A structured system for managing transactions and orders.
- Administrative supervision to maintain marketplace reliability.

Bookify is initially designed with the Philippine market in mind.

## ✨ Key Features

### 🛒 Marketplace

- Browse available books.
- Discover new and pre-owned physical books.
- Explore downloadable digital e-books.
- View product descriptions, prices, and condition information.
- Access seller-provided product listings.

### 📦 Seller Management

- Create and manage book listings.
- Set individual product prices.
- Upload product images.
- Provide descriptions and book condition details.
- Confirm product availability when an order is placed.

### 📋 Listing Moderation

- Submitted listings undergo staff review.
- Staff can approve or reject listings.
- Product information can be checked before publication.
- Helps maintain listing quality and marketplace standards.

### 🚚 Order and Delivery Management

- Process customer purchases.
- Coordinate seller availability confirmation.
- Assign delivery personnel through designated staff.
- Track order processing.
- Separate product prices from delivery charges.

### 💳 Payment Support

The proposed platform supports conventional payment options, including:

- Cash on Delivery (COD).
- Card-based payments.
- Bank transfers.
- External online payment services.

*Payment integration and processing depend on the final implementation.*

### 🛡️ Administrative Management

- Manage customer and seller accounts.
- Supervise marketplace activities.
- Review product listings.
- Handle refund requests and disputes.
- Monitor policy violations.

---

## 👥 User Roles

Bookify consists of four primary user categories.

| Role | Responsibilities |
|---|---|
| Administrator | Oversees platform operations and account management. |
| Customer | Browses books, purchases products, and manages orders. |
| Seller | Creates listings, manages prices, and confirms availability. |
| Staff | Reviews listings, handles operational tasks, and coordinates deliveries. |

### Administrator
Responsible for the overall management and supervision of the platform.

### Customer
Users who browse the marketplace and purchase available physical books or e-books.

### Seller
Individuals or independent sellers who offer books through the platform. Sellers are responsible for their listings, pricing, descriptions, and availability.

### Staff
Personnel responsible for operational activities, including listing moderation, order processing, delivery assignments, and customer-related concerns.

---

## 📚 Supported Products

Bookify supports two major product categories.

| Category | Description |
|---|---|
| New Books | Brand-new physical books. |
| Pre-owned Books | Previously owned physical books sold by independent sellers. |
| E-books | Digital books made available for download. |

Sellers are expected to provide accurate product information, including descriptions, condition details, and relevant images.

For digital products, sellers must have the necessary rights or authorization to distribute their uploaded content.

---

## 🔄 Marketplace Workflow

The general marketplace workflow follows these steps:

1. **Seller Registration** – A seller creates an account and prepares to publish book listings.
2. **Product Listing** – The seller submits product information, pricing, descriptions, and images.
3. **Listing Review** – Staff review the submitted listing before it becomes publicly available.
4. **Customer Purchase** – Customers browse the marketplace and place an order.
5. **Availability Confirmation** – The seller confirms whether the requested product is available.
6. **Order Processing** – Staff coordinate the necessary order-related activities.
7. **Delivery Assignment** – Delivery personnel are assigned for applicable physical orders.
8. **Order Completion** – The transaction is completed according to the selected payment and delivery arrangements.

Digital products follow a separate fulfillment process that allows customers to access their purchased e-books.

---

## 💰 Business Rules and Policies

### Seller Pricing and Commission

Sellers have the freedom to determine their own product prices.

Bookify proposes a **15% commission** on the book's selling price.

Example:

| Description | Amount |
|---|---:|
| Book Selling Price | ₱500.00 |
| Bookify Commission (15%) | ₱75.00 |
| Seller's Earnings | ₱425.00 |

Delivery charges are calculated separately and are not included in the example above.

### Delivery Policy

- Initial delivery coverage is limited to the Philippines.
- Delivery fees are separate from product prices.
- Delivery assignments are coordinated by authorized staff.
- Order cancellation policies apply to applicable delivery arrangements.

### Refund and Return Policy

- Customers must provide a reason when requesting a refund.
- Refund requests require review and approval from authorized staff.
- Products damaged during delivery may qualify for a refund.
- Relevant parties, including buyers, sellers, and staff, may be notified regarding delivery-related damage.
- Completed purchases are generally not eligible for ordinary returns unless covered by applicable policies.

### Account and Marketplace Violations

Bookify aims to maintain a reliable marketplace through appropriate enforcement measures.

Possible consequences for policy violations include:

- Account warnings.
- Additional penalties for repeated violations.
- Account suspension or termination for serious or repeated misconduct.

---

## 🛠️ Technology Stack

Bookify uses a client-server development approach.

### Frontend

| Technology | Purpose |
|---|---|
| React | Building the user interface. |
| TypeScript | Type-safe application development. |
| Tailwind CSS | Styling and responsive layouts. |

### Backend

| Technology | Purpose |
|---|---|
| PHP | Server-side processing and application logic. |
| XAMPP | Local development environment and server management. |

### Development Tools

- Git – Version control.
- GitHub – Source code hosting and collaboration.
- Visual Studio Code – Code editor.

---

## 📁 Project Structure

The project follows a frontend/backend separation approach.

The exact directory structure may evolve as development progresses.

A possible organization:

```text
Bookify/
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── types/
│   │
│   └── package.json
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   └── index.php
│
├── database/
│   └── bookify.sql
│
├── .gitignore
└── README.md
```

*This is a suggested organization, not a declaration of the current repository structure.*

---

## ⚙️ Installation and Setup

### Prerequisites

Before running the project, make sure the following are available:

- [Node.js](https://nodejs.org/)
- [npm](https://www.npmjs.com/)
- [XAMPP](https://www.apachefriends.org/)
- [Git](https://git-scm.com/)

### 1. Clone the Repository

```bash
git clone <repository-url>
```

Navigate into the project directory:

```bash
cd Bookify
```

### 2. Frontend Setup

Navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

### 3. Backend Setup

1. Install and launch XAMPP.
2. Start Apache and MySQL if required by the backend configuration.
3. Place or configure the backend files within the appropriate local server directory.
4. Configure the database connection.
5. Import the provided SQL database file once available.

Backend setup instructions may change as the implementation develops.

---

## 🧑‍💻 Development Notes

Bookify is being developed as an academic Information Management project.

Development priorities include:

- Maintaining a clear separation between frontend and backend responsibilities.
- Implementing role-based access and permissions.
- Maintaining consistent database relationships.
- Validating user-submitted information.
- Ensuring appropriate handling of transactions and product listings.
- Keeping the system manageable within the project's academic scope.

Features and implementation details may change throughout development.

---

## 🎯 Project Scope

The initial development focuses on establishing the core marketplace functionality.

Included in the planned scope:

- User account management.
- Book listing management.
- Product browsing.
- Seller and customer interactions.
- Order processing.
- Basic payment method support.
- Staff-assisted delivery coordination.
- Administrative supervision.
- Refund and policy management.

The project prioritizes essential marketplace operations over unnecessary complexity.

---

## ⚠️ Disclaimer

Bookify is an academic software development project.

It is intended for educational and demonstration purposes. Features, policies, payment processing, and operational workflows are subject to revision during development.

---

## 📌 Project Status

**Status:** In Development

More features, documentation, and implementation details will be added as the project progresses.

---

**Bookify — Read books, sell books, buy books, read books again.** 📚