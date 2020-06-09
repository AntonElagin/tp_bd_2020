const Users = require('../models/userModel');

class UserController {
  static async getUser(req, resp) {
    const nickname = req.params.nickname;
    const result = await Users.getUserInfo(nickname);

    if (result.success && result.data) {
      return resp.status(200).json(result.data);
    }
    return resp.status(404).json({
      message: `Can't find user with nickname '${nickname}'\n`,
    });
  }

  static async createUser(req, resp) {
    const userData = {
      nickname: req.params.nickname,
      ...req.body,
    };

    const createdUser = await Users.getUserByNicknameOrEmail(
        userData.nickname,
        userData.email,
    );

    if (createdUser.success && createdUser.data) {
      return resp.status(409).json(createdUser.data);
    }

    const newUser = await Users.createNewUser(userData);
    if (newUser.success) {
      return resp.status(201).json(newUser.data);
    }
    return resp.status(500);
  }

  static async updateUser(req, resp) {
    const nickname = req.params.nickname;
    const userData = req.body;

    const userExist = await Users.getUserInfo(nickname);
    if (!(userExist.success && userExist.data)) {
      return resp.status(404).json({
        message: `Can't find user with nickname '${nickname}'\n`,
      });
    }

    const conflictData = await Users.getUserByNicknameOrEmail(
        userData.nickname,
        userData.email,
    );

    if (conflictData.success && conflictData.data) {
      return resp.status(409).json({
        message: 'Data conflict',
      });
    }

    const updatedUser = await Users.updateUserProfile(
        nickname,
        userData,
    );

    if (updatedUser.success) {
      return resp.status(200).json(updatedUser);
    }

    return resp.status(500);
  }
}

module.exports = UserController;
