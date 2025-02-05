const User = require('../models/User'); // Adjust the path as needed

// Controller to fetch all users
const getAllUsers = async (req, res) => {
  try {
    // Fetch all users from the database
    const users = await User.find();

    // Send response with the users
    res.status(200).json({
      success: true,
      message: 'Users fetched successfully',
      data: users,
    });
  } catch (error) {
    // Handle any errors
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message,
    });
  }
};

const getUserById = async (req, res) => {
    const { id } = req.params; // Extract user ID from URL params
  
    try {
      const user = await User.findById(id); // Query user by MongoDB `_id`
  
      if (!user) {
        return res.status(404).json({
          success: false,
          message: `User with ID ${id} not found`,
        });
      }
  
      res.status(200).json({
        success: true,
        message: 'User fetched successfully',
        data: user,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user',
        error: error.message,
      });
    }
  };

  
module.exports = { getAllUsers };
