# 🇮🇳 Neta Khoj

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-4.x-000000?style=for-the-badge&logo=express&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Active-success?style=for-the-badge)

**A comprehensive platform for exploring India's political landscape**

[Features](#-features) • [Installation](#-installation) • [API](#-api-documentation) • [Security](#-security) • [Contributing](#-contributing)

</div>

---

## 📖 Overview

**Neta Khoj** is a powerful, data-driven platform that provides citizens with transparent access to information about India's elected representatives. From interactive constituency maps to detailed financial disclosures, Neta Khoj empowers users to make informed decisions about their political representatives.

### Why Neta Khoj?

- 🎯 **Transparency First**: Access verified data from election affidavits and official sources
- 🚀 **Real-time Updates**: Live scraped performance metrics and attendance records
- 🔒 **Security Focused**: Enterprise-grade security with rate limiting and threat protection
- ⚡ **Lightning Fast**: Optimized proxy APIs with intelligent caching
- 📱 **User Friendly**: Intuitive interface with powerful search capabilities

---

## ✨ Features

### 🗺️ Interactive India Map

Explore India's political landscape through a fully interactive, pan-India map featuring:

- **Dual Constituency View**: Toggle between Vidhan Sabha (Assembly) and Lok Sabha (Parliamentary) constituencies
- **Smart Navigation**: Seamless zooming, highlighting, and state-level browsing
- **One-Click Details**: Click any constituency to instantly view comprehensive political information
- **Visual Insights**: Color-coded representations of political party dominance

### 🏛️ Constituency Dashboard

Get complete constituency intelligence at your fingertips:

#### 📊 Current Representation
- Serving MLA (Assembly constituencies)
- Current MP (Parliamentary constituencies)
- Historical representatives with tenure details
- Party succession timeline

#### 📈 Political Analytics
- Real-time party strength across:
  - **Lok Sabha** (Lower House)
  - **Rajya Sabha** (Upper House)
  - **Vidhan Sabha** (State Assembly)
- Seat share distribution and trends
- Coalition analysis

### 🔍 Advanced Search System

Find what you need, instantly:

- **Multi-Entity Search**: Leaders, constituencies, states, and political parties
- **Smart Autocomplete**: Debounced, lightning-fast suggestions
- **Intelligent Routing**: Direct navigation to detailed profiles
- **Graceful Fallbacks**: Clear UI for edge cases and no results
- **Proxy-Powered**: Secure, optimized API calls for enhanced performance

### 👤 Comprehensive Leader Profiles

Deep-dive into verified information about every elected representative:

#### Personal & Professional
- Full biographical details
- Family information (spouse, dependents)
- Educational qualifications
- Professional background and expertise

#### Financial Transparency
- **Assets**: Complete breakdown of movable and immovable assets
- **Real Estate**: Residential, commercial, and agricultural properties
- **Vehicles**: All registered vehicles with valuations
- **Liabilities**: Loans, debts, and financial obligations
- **Net Worth**: Calculated total assets minus liabilities

#### Performance Metrics
- **Legislative Activity**:
  - Attendance percentage
  - Debates participated
  - Questions raised in Parliament/Assembly
  - Private Member Bills introduced
- **Constituency Work**: Development initiatives and local engagement

#### Legal Record
- Criminal cases (if listed in election affidavits)
- Case status and court details
- Complete transparency on pending charges

### 📸 Smart Image Infrastructure

Every visual element is optimized through an intelligent proxy system:

- **Security**: Masked original URLs to prevent tracking
- **Performance**: Automatic compression and format optimization
- **Reliability**: Local caching with smart invalidation
- **Protection**: Malicious URL filtering and validation
- **Fallbacks**: Graceful degradation with placeholder images

### ⚙️ Admin Dashboard & Monitoring

Powerful tools for platform management and oversight:

#### 🖥️ System Health
- **Real-time Metrics**:
  - Heap memory usage
  - RSS (Resident Set Size) tracking
  - CPU utilization
  - Request throughput
- **Intelligent Alerts**: Automatic notifications when thresholds are exceeded
- **Historical Analysis**: CSV export with configurable intervals (5/15 minutes)

#### 🛡️ Security Operations Center
- **Threat Monitoring**: Real-time suspicious activity detection
- **Access Control**: IP-based blocking and whitelisting
- **Rate Limit Enforcement**: Violation tracking and automatic throttling
- **Audit Trails**: Comprehensive request logging via Winston

#### 💾 Storage Management
- File-based storage analytics
- Automated backup triggers
- Log rotation and cleanup policies
- Storage optimization recommendations

### 🔐 Enterprise-Grade Security

Multi-layered protection for data integrity and user safety:

#### Threat Prevention
- **Input Validation**: Strict sanitization of all user inputs
- **SQL Injection Protection**: Parameterized queries and filters
- **XSS Defense**: Content Security Policy and output encoding
- **Path Traversal Protection**: Filesystem access restrictions
- **CSRF Guards**: Token-based request validation

#### Access Management
- **Bearer Token Authentication**: Secure admin endpoint protection
- **CORS Configuration**: Granular origin restrictions
- **Role-Based Access**: Tiered permission system

#### Rate Limiting
- **Standard Tier**: 60 requests/minute per IP
- **Elevated Limits**: Separate quotas for authenticated users
- **WebSocket Throttling**: Connection limits per IP
- **Distributed Protection**: Handles load-balanced environments

### 🔌 Robust API Architecture

#### REST API
Production-ready endpoints for:
- **Search Operations**: Unified search with filtering
- **Analytics**: Platform usage and statistics
- **Security Controls**: Admin tools and threat management
- **System Metrics**: Memory, performance, and health checks
- **Storage Utilities**: Backup, cleanup, and optimization

#### WebSocket Integration
Real-time bidirectional communication for:
- **Live Updates**: Memory and performance metrics
- **Security Alerts**: Instant threat notifications
- **Dashboard Streaming**: Real-time admin panel updates
- **System Events**: Background job status and completions

### 🤖 Automated Background Jobs

Intelligent scheduled tasks keep the platform running smoothly:

- **Log Management**: Automatic cleanup and archival
- **Storage Optimization**: Cache expiration and unused file removal
- **Memory Snapshots**: Periodic performance baseline capture
- **Error Tracking**: Aggregation and trend analysis
- **Health Checks**: Proactive system monitoring

### ⚡ High-Performance Architecture

Built for scale and maintainability:

- **Express.js Backend**: Battle-tested, production-grade framework
- **Proxy Layer**: Secure, cached external API requests
- **Intelligent Caching**: Multi-tier cache strategy
- **Modular Design**: Clean separation of concerns
- **Scalable Structure**: Organized for team collaboration

---

## 🚀 Installation

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

### Quick Start

```bash
# Clone the repository
git clone https://github.com/Rex1671/NetaKhoj.git

# Navigate to project directory
cd neta-khoj

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your configuration

# Start the development server
npm run dev

# For production
npm start
```

### Environment Configuration

Create a `.env` file with the following variables:

```env
PORT=3000
NODE_ENV=production
ADMIN_TOKEN=your_secure_token_here
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=60
```

---

## 📚 API Documentation

### Authentication

Admin endpoints require Bearer token authentication:

```bash
Authorization: Bearer YOUR_ADMIN_TOKEN
```

### Core Endpoints

#### Search
```http
GET /api/search?q=query&type=leader
```

#### Leader Profile
```http
GET /api/leader/:id
```

#### Constituency Details
```http
GET /api/constituency/:id
```

#### Analytics
```http
GET /api/analytics
```

### Admin Endpoints

#### System Metrics
```http
GET /api/admin/metrics
Authorization: Bearer TOKEN
```

#### Security Logs
```http
GET /api/admin/security/logs
Authorization: Bearer TOKEN
```

---

## 🛡️ Security

Neta Khoj takes security seriously. If you discover a security vulnerability, please email security@netakhoj.com.

### Security Features

- ✅ Input sanitization and validation
- ✅ Rate limiting and DDoS protection
- ✅ SQL injection prevention
- ✅ XSS protection
- ✅ CSRF tokens
- ✅ Secure headers (Helmet.js)
- ✅ Regular security audits

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Election Commission of India for public data access
- Open-source community for amazing tools and libraries
- Contributors who help make this project better

---

<div align="center">

**Made with ❤️ for transparency in Indian democracy**

[Report Bug](https://github.com/yourusername/neta-khoj/issues) • [Request Feature](https://github.com/Rex1671/NetaKhoj/issues)

</div>
