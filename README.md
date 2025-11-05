# SlotSwapper - Class Schedule Management System

SlotSwapper is a web application that allows students to manage and swap their class schedules efficiently. Built with React and Node.js, it provides an intuitive interface for viewing, managing, and exchanging class time slots with other students.

## Features

- 📅 View and manage your class schedule
- 🔄 Request slot swaps with other students
- ✅ Accept or reject incoming swap requests
- 🔔 Real-time status updates for swap requests
- 🔐 Secure authentication system
- 💼 User-friendly interface

## Tech Stack

### Frontend
- React 18
- Vite
- TailwindCSS
- Lucide React (for icons)

### Backend
- Node.js
- Express.js
- MongoDB
- JWT Authentication

## Prerequisites

Before running this project, make sure you have the following installed:
- Node.js (v14 or higher)
- MongoDB (running locally or a cloud instance)

## Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/kaushal8787/Slot-Swapper.git
cd Slot-Swapper
```

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file with following content
# Replace MONGODB_URI with your MongoDB connection string
echo "MONGODB_URI=your_mongodb_uri
PORT=5000
JWT_SECRET=your_jwt_secret" > .env

# Start the backend server
npm run dev
```

### 3. Frontend Setup
```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the frontend development server
npm run dev
```

### 4. Access the Application
- Frontend: Open [http://localhost:3000](http://localhost:3000) in your browser
- Backend API: [http://localhost:5000](http://localhost:5000)

## Usage

1. **Register/Login**: Create a new account or login with existing credentials
2. **View Schedule**: See your current class schedule on the calendar view
3. **Make Slots Swappable**: Mark any of your slots as available for swapping
4. **Request Swaps**: Browse available slots from other students and request swaps
5. **Manage Requests**: Accept or reject incoming swap requests
6. **View History**: Track all your swap requests and their status

## Project Structure
```
SlotSwapper/
├── frontend/              # React frontend
│   ├── src/              # Source files
│   ├── public/           # Static files
│   └── package.json      # Frontend dependencies
├── backend/              # Node.js backend
│   ├── server.js         # Server entry point
│   └── package.json      # Backend dependencies
└── README.md            # Project documentation
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/YourFeature`)
3. Commit your changes (`git commit -m 'Add some feature'`)
4. Push to the branch (`git push origin feature/YourFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.