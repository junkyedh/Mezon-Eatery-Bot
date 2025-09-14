# NCC Credit System - Mezon Bot

A comprehensive Peer-to-Peer lending system built with NestJS and TypeScript for the Mezon chat platform, featuring advanced loan management, automated token transfers, and sophisticated admin controls.

## 🏦 Key Features

### **P2P Lending System**
- **Loan Requests**: Create loan requests with flexible terms (7 days to 1 year)
- **Automated Funding**: Seamless lender-to-borrower token transfers via Mezon SDK
- **Smart Interest Calculation**: Pro-rata interest calculation based on actual days
- **Fee Management**: Fixed transaction fees with transparent tracking

### **Advanced Pool Management**
- **Liquidity Pool**: Centralized token pool with real-time balance tracking
- **Fee Collection**: Automated fee collection and withdrawal system
- **Balance Reconciliation**: Automatic sync between internal ledger and Mezon wallet

### **Multi-Tier Admin System**
- **Owner Privileges**: Full system control with user management
- **Delegate Permissions**: Temporary admin rights for trusted users
- **Runtime Assignment**: Dynamic admin role assignment without code changes
- **Audit Features**: Debug commands for pool and loan state inspection

### **Technical Excellence**
- **Modern Architecture**: Built with NestJS framework using TypeScript
- **Command System**: Extensible command system with metadata support
- **Database Integration**: PostgreSQL with TypeORM for data persistence
- **Error Handling**: Comprehensive error handling and transaction safety
- **Idempotency**: Duplicate transaction prevention with idempotency keys

## 🎯 Core Commands

### **Wallet & Balance Management**
- `!balance` - Check balance and NCC Credit Pool status
- `!deposit <amount>` - Deposit tokens to internal wallet
- `!withdraw <amount>` - Withdraw tokens from internal wallet

### **P2P Lending (Borrower)**
- `!loan <amount> <days>` - Create loan request (min: 10,000đ)
- `!checklist-loan` - View pending loan requests
- `!transaction <loanId>` - Track loan status and payments
- `!repay <loanId>` - Repay loan with interest

### **P2P Lending (Lender)**
- `!checklist-loan` - Browse available loan requests
- `!loan-fund <loanId>` - Fund a loan request
- `!transaction <loanId>` - Monitor funded loans

### **Admin Commands**

#### **Delegate Level** (Assigned Users)
- `!admin balance` - View pool balance and fee collection
- `!admin withdraw <amount>` - Withdraw collected fees

#### **Owner Level** (ADMIN_MZ_USERS)
- All delegate commands plus:
- `!admin assign @username` - Grant temporary admin rights
- `!admin revoke @username|all` - Revoke admin rights
- `!admin reset-pool` - Recalculate pool balance (debug)
- `!admin reset-loan <loanId>` - Reset loan state (debug)

## ⚙️ System Requirements

- Node.js 18+ 
- PostgreSQL 12+
- yarn (recommended) or npm
- Mezon Bot Token with transfer permissions

## 🔧 Installation & Setup

### 1. Clone Repository
```bash
git clone https://github.com/junkyedh/Mezon-Eatery-Bot
cd SGI
```

### 2. Install Dependencies
```bash
yarn install
```

### 3. Environment Configuration
```bash
cp .env.example .env.local
```

Configure your `.env.local` file:
```env
# Database Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_DB=mezon_bot

# Mezon Bot Configuration  
MEZON_TOKEN=your_mezon_bot_token

# Admin Configuration (Owner MezonUserIds - comma separated)
ADMIN_MZ_USERS=your_mezon_user_id
```

### 4. Database Setup
```bash
# Run database migrations
yarn db:run
```

### 5. Admin Configuration
To set up system owners, add your Mezon User IDs to the `ADMIN_MZ_USERS` environment variable:
```env
ADMIN_MZ_USERS=your
```
**Note**: Only users listed here can assign delegate admin rights to others.

## 🚀 Running the Application

```bash
# Development mode
yarn start:dev

# Production mode  
yarn start:prod

# Debug mode
yarn start:debug
```

## 💡 Quick Start Guide

### **For Borrowers:**
1. `!deposit 20000` - Deposit tokens for repayment later - use Transfer Funds from Mezon SDK
2. `!loan 15000 30` - Request 15,000đ loan for 30 days
3. `!transaction <loanId>` - Monitor your loan status
4. `!repay <loanId>` - Repay when ready

### **For Lenders:**
1. `!deposit 50000` - Add liquidity to your internal wallet
2. `!checklist-loan` - Browse available loan requests
3. `!loan-fund <loanId>` - Fund a promising loan
4. `!transaction <loanId>` - Track your investment

### **For Admins:**
1. `!admin balance` - Monitor pool health and fees
2. `!admin withdraw 5000` - Withdraw collected fees
3. `!admin assign @trusted_user` - Grant temporary admin rights
4. `!admin revoke @user` - Revoke admin access

## ⚡ System Highlights

### **Interest Rate Structure**
- **Weekly loans**: 0.5% annual rate
- **Monthly loans**: 3.5% annual rate  
- **Quarterly loans**: 3.8% annual rate
- **Yearly loans**: 4.85% annual rate

### **Fee Structure**
- **Transaction fee**: Fixed 5,000đ per loan (deducted at funding)
- **Minimum loan**: 10,000đ (ensures 5,000đ minimum disbursement)

### **Advanced Features**
- **Pro-rata Interest**: Interest calculated based on actual days used
- **Early Repayment**: Pay early and save on interest
- **Atomic Transactions**: All transfers are atomic and idempotent
- **Real-time Tracking**: Live loan status and balance updates

## 🏗️ Technical Architecture

```
src/
├── command/           # Chat command handlers
│   ├── common/       # Command base classes
│   ├── admin.command.ts      # Admin management
│   ├── balance.command.ts    # Wallet operations
│   ├── loan-*.command.ts     # Loan lifecycle
│   └── help.command.ts       # Documentation
├── services/         # Core business logic  
│   ├── pool.service.ts       # Liquidity management
│   ├── loan.service.ts       # Loan operations
│   ├── user.service.ts       # User management
│   ├── mezon-wallet.service.ts # Mezon SDK integration
│   └── transaction.service.ts  # Transaction handling
├── entities/         # Database models
│   ├── pool.entity.ts        # Pool balance tracking
│   ├── loan.entity.ts        # Loan records
│   ├── user.entity.ts        # User profiles
│   └── transaction.entity.ts # Transaction logs
├── config/           # Environment configuration
├── migrations/       # Database schema migrations
└── utils/           # Shared utilities
```

## 🔍 Monitoring & Debugging

### **Pool Health Commands** (Owner only)
```bash
!admin balance          # View detailed pool status
!admin reset-pool      # Recalculate pool balances
!admin reset-loan <id> # Reset loan state for debugging
```

### **Transaction Tracking**
```bash
!transaction <loanId>  # View complete loan lifecycle
!balance              # Check personal balance and limits
```

## 🧪 Testing

```bash
# Unit tests
yarn test

# End-to-end tests
yarn test:e2e

# Test coverage
yarn test:cov
```

## �️ Security Features

### **Transaction Safety**
- **Idempotency Keys**: Prevent duplicate transactions
- **Atomic Operations**: All-or-nothing transaction processing
- **Balance Verification**: Real-time balance checks before transfers
- **Error Recovery**: Automatic rollback on failed operations

### **Access Control**
- **Multi-tier Admin System**: Owner → Delegate hierarchy
- **Runtime Permission Management**: Dynamic admin assignment
- **Audit Logging**: Complete transaction and admin action logs
- **Environment-based Configuration**: Secure credential management

## 🎓 Learning Resources

### **For Developers**
- Review `src/command/` for command implementation patterns
- Study `src/services/` for business logic architecture
- Check `src/entities/` for database schema design
- Examine `src/migrations/` for database evolution

### **For System Administrators**
- Monitor `!admin balance` for pool health
- Use debug commands to troubleshoot issues
- Regular database backups recommended
- Monitor Mezon SDK connection stability

## 🔧 Development Guide

### **Adding New Commands**
1. Create command file in `src/command/`
2. Extend `CommandMessage` class
3. Use `@Command` decorator with metadata
4. Register in `BotModule`

```typescript
@Command('mycommand', {
  description: 'My custom command',
  usage: '!mycommand <args>',
  category: 'Custom',
  aliases: ['mc'],
})
export class MyCommand extends CommandMessage {
  execute(args: string[], message: ChannelMessage) {
    const messageContent = `Hello ${message.username}!`;
    return this.replyMessageGenerate({ messageContent }, message);
  }
}
```

### **Code Quality Tools**
```bash
# Lint and format
yarn lint
yarn format

# Build and test
yarn build
yarn test
```

### **Database Migrations**
```bash
# Generate new migration
yarn db:generate MigrationName

# Run pending migrations  
yarn db:run

# Revert last migration
yarn db:revert
```

## � Performance & Scalability

### **Optimizations**
- **Connection Pooling**: PostgreSQL connection optimization
- **Query Optimization**: Efficient database queries with proper indexing
- **Memory Management**: Optimized object lifecycle management
- **Event-driven Architecture**: Non-blocking asynchronous processing

### **Monitoring**
- Transaction success/failure rates via logs
- Pool balance health via admin commands
- Database performance via TypeORM query logs
- Mezon SDK response times and errors

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **NestJS Team** for the excellent framework
- **Mezon Platform** for providing the chat infrastructure
- **TypeORM Team** for the robust database integration
- **Open Source Community** for inspiration and best practices

---

**Built with ❤️ by SGI Team**

For support or questions, please open an issue in the GitHub repository.

- **Command Pattern**: For bot commands
- **Observer Pattern**: For event handling
- **Dependency Injection**: Via NestJS
- **Repository Pattern**: With TypeORM

## 🚀 Deployment

### Docker (Recommended)

```bash
# Build image
docker build -t mezon-bot-template .

# Run container
docker run -d --name mezon-bot-template \
  --env-file .env.production \
  -p 3000:3000 \
  mezon-template
```

### Manual Deployment

```bash
# Build application
yarn build

# Run production
NODE_ENV=production yarn start:prod
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 👤 Author

| Name                  | GitHub Profile |
|-----------------------|----------------|
| Tran Huynh Nha Uyen   | [@tranuyn](https://github.com/tranuyn) |
| Duong Hai Han         | [@han.duonghai](https://github.com/Junkyedh) |
| Nguyen Ton Minh Quan  | [@quan.nguyentonminh](https://github.com/xmen02052003lx) |

## 🙏 Acknowledgments

- Built with [NestJS](https://nestjs.com/)
- Powered by [Mezon SDK](https://github.com/nccasia/mezon-sdk)
- Database with [TypeORM](https://typeorm.io/)