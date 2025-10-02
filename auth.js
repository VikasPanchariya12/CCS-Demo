// Authentication and User Management System
class AuthSystem {
  constructor() {
    this.currentUser = null;
    this.init();
  }

  init() {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      this.currentUser = JSON.parse(savedUser);
      this.updateUI();
    }
  }

  // Register new user
  register(userData) {
    const { email, password, firstName, lastName, phone, address } = userData;
    
    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      throw new Error('Please fill in all required fields');
    }

    // Check if user already exists
    const users = this.getUsers();
    if (users.find(user => user.email === email)) {
      throw new Error('User with this email already exists');
    }

    // Create new user
    const newUser = {
      id: Date.now().toString(),
      email,
      password: this.hashPassword(password), // Simple hash for demo
      firstName,
      lastName,
      phone: phone || '',
      address: address || '',
      createdAt: new Date().toISOString(),
      orders: []
    };

    // Save user
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));

    return { success: true, message: 'Account created successfully!' };
  }

  // Login user
  login(email, password) {
    const users = this.getUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
      throw new Error('User not found');
    }

    if (user.password !== this.hashPassword(password)) {
      throw new Error('Invalid password');
    }

    // Set current user (remove password from stored data)
    const userWithoutPassword = { ...user };
    delete userWithoutPassword.password;
    
    this.currentUser = userWithoutPassword;
    localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
    
    this.updateUI();
    return { success: true, message: 'Login successful!' };
  }

  // Logout user
  logout() {
    this.currentUser = null;
    localStorage.removeItem('currentUser');
    this.updateUI();
    window.location.href = 'index.html';
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Check if user is logged in
  isLoggedIn() {
    return this.currentUser !== null;
  }

  // Get all users from localStorage
  getUsers() {
    const users = localStorage.getItem('users');
    return users ? JSON.parse(users) : [];
  }

  // Simple password hashing (for demo purposes only)
  hashPassword(password) {
    return btoa(password + 'fruit_shop_salt');
  }

  // Update UI based on login status
  updateUI() {
    const authLinks = document.querySelectorAll('.auth-links');
    const userInfo = document.querySelectorAll('.user-info');
    
    authLinks.forEach(links => {
      if (this.isLoggedIn()) {
        links.innerHTML = `
          <span class="user-greeting">Hello, ${this.currentUser.firstName}!</span>
          <a href="profile.html" class="profile-link">My Account</a>
          <button onclick="authSystem.logout()" class="logout-btn">Logout</button>
        `;
      } else {
        links.innerHTML = `
          <a href="login.html" class="login-link">Login</a>
          <a href="register.html" class="register-link">Register</a>
        `;
      }
    });
  }

  // Update user profile
  updateProfile(userData) {
    if (!this.isLoggedIn()) {
      throw new Error('Please login first');
    }

    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.id === this.currentUser.id);
    
    if (userIndex === -1) {
      throw new Error('User not found');
    }

    // Update user data
    const updatedUser = { ...users[userIndex], ...userData };
    users[userIndex] = updatedUser;
    
    // Update stored data
    localStorage.setItem('users', JSON.stringify(users));
    
    // Update current user (remove password)
    const userWithoutPassword = { ...updatedUser };
    delete userWithoutPassword.password;
    this.currentUser = userWithoutPassword;
    localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));

    return { success: true, message: 'Profile updated successfully!' };
  }
}

// Order Management System
class OrderSystem {
  constructor(authSystem) {
    this.authSystem = authSystem;
  }

  // Create new order
  createOrder(basketItems, deliveryDetails) {
    if (!this.authSystem.isLoggedIn()) {
      throw new Error('Please login to place an order');
    }

    const order = {
      id: 'ORD-' + Date.now(),
      userId: this.authSystem.getCurrentUser().id,
      items: basketItems,
      deliveryDetails,
      status: 'pending',
      orderDate: new Date().toISOString(),
      estimatedDelivery: this.calculateDeliveryTime(),
      total: this.calculateTotal(basketItems),
      statusHistory: [
        {
          status: 'pending',
          timestamp: new Date().toISOString(),
          message: 'Order placed successfully'
        }
      ]
    };

    // Save order
    const orders = this.getOrders();
    orders.push(order);
    localStorage.setItem('orders', JSON.stringify(orders));

    // Add order to user's order history
    this.addOrderToUser(order.id);

    // Clear basket
    localStorage.removeItem('basket');

    return order;
  }

  // Get all orders
  getOrders() {
    const orders = localStorage.getItem('orders');
    return orders ? JSON.parse(orders) : [];
  }

  // Get user's orders
  getUserOrders() {
    if (!this.authSystem.isLoggedIn()) {
      return [];
    }

    const orders = this.getOrders();
    return orders.filter(order => order.userId === this.authSystem.getCurrentUser().id)
                 .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
  }

  // Get order by ID
  getOrderById(orderId) {
    const orders = this.getOrders();
    return orders.find(order => order.id === orderId);
  }

  // Update order status
  updateOrderStatus(orderId, newStatus, message = '') {
    const orders = this.getOrders();
    const orderIndex = orders.findIndex(order => order.id === orderId);
    
    if (orderIndex === -1) {
      throw new Error('Order not found');
    }

    const order = orders[orderIndex];
    order.status = newStatus;
    order.statusHistory.push({
      status: newStatus,
      timestamp: new Date().toISOString(),
      message: message || this.getStatusMessage(newStatus)
    });

    localStorage.setItem('orders', JSON.stringify(orders));
    return order;
  }

  // Calculate delivery time (mock calculation)
  calculateDeliveryTime() {
    const now = new Date();
    now.setHours(now.getHours() + 2); // 2 hours from now
    return now.toISOString();
  }

  // Calculate order total
  calculateTotal(basketItems) {
    // Mock pricing
    const prices = {
      apple: 2.99,
      banana: 1.99,
      lemon: 3.49,
      pear: 3.29
    };

    let total = 0;
    basketItems.forEach(item => {
      if (item.startsWith('bundle_')) {
        total += 8.99; // Bundle price
      } else {
        total += prices[item] || 2.99;
      }
    });

    return parseFloat(total.toFixed(2));
  }

  // Add order to user's order history
  addOrderToUser(orderId) {
    const users = this.authSystem.getUsers();
    const userIndex = users.findIndex(u => u.id === this.authSystem.getCurrentUser().id);
    
    if (userIndex !== -1) {
      if (!users[userIndex].orders) {
        users[userIndex].orders = [];
      }
      users[userIndex].orders.push(orderId);
      localStorage.setItem('users', JSON.stringify(users));
    }
  }

  // Get status message
  getStatusMessage(status) {
    const messages = {
      pending: 'Order is being processed',
      confirmed: 'Order confirmed and being prepared',
      preparing: 'Your fresh fruits are being prepared',
      out_for_delivery: 'Order is out for delivery',
      delivered: 'Order has been delivered',
      cancelled: 'Order has been cancelled'
    };
    return messages[status] || 'Status updated';
  }

  // Simulate order progress (for demo)
  simulateOrderProgress(orderId) {
    const statuses = ['confirmed', 'preparing', 'out_for_delivery', 'delivered'];
    let currentStatusIndex = 0;

    const updateStatus = () => {
      if (currentStatusIndex < statuses.length) {
        this.updateOrderStatus(orderId, statuses[currentStatusIndex]);
        currentStatusIndex++;
        setTimeout(updateStatus, 30000); // Update every 30 seconds
      }
    };

    setTimeout(updateStatus, 5000); // Start after 5 seconds
  }
}

// Initialize systems
const authSystem = new AuthSystem();
const orderSystem = new OrderSystem(authSystem);

// Export for use in other files
window.authSystem = authSystem;
window.orderSystem = orderSystem;
