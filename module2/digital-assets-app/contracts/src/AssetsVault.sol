// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC721/IERC721.sol";
import "openzeppelin-contracts/contracts/access/Ownable.sol";

contract AssetsVault is Ownable {
    // Lưu trữ số dư ERC-20 của mỗi user
    mapping(address => mapping(address => uint256)) public tokenBalances;

    // Lưu trữ danh sách NFT mà user đã nạp
    mapping(address => mapping(address => uint256[])) private userNFTs;

    // 📌 Danh sách token ERC-20 được hỗ trợ
    address[] private supportedTokens;

    // ================== ERC-20 FUNCTIONS ==================
    
    // ✅ Nạp token vào contract
    function depositToken(address token, uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        tokenBalances[msg.sender][token] += amount;

        emit TokenDeposited(msg.sender, token, amount);
    }

    // ✅ Rút token khỏi contract
    function withdrawToken(address token, uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(tokenBalances[msg.sender][token] >= amount, "Insufficient balance");

        tokenBalances[msg.sender][token] -= amount;
        IERC20(token).transfer(msg.sender, amount);

        emit TokenWithdrawn(msg.sender, token, amount);
    }

    // ✅ Lấy số dư token của user đối với một loại token cụ thể
    function getUserTokenBalance(address user, address token) external view returns (uint256) {
        return tokenBalances[user][token];
    }

    // ✅ Thêm token ERC-20 vào danh sách hỗ trợ (chỉ admin)
    function addSupportedToken(address token) external onlyOwner {
        supportedTokens.push(token);
    }

    // ✅ Lấy danh sách token ERC-20 được hỗ trợ
    function getAllSupportedTokens() public view returns (address[] memory) {
        return supportedTokens;
    }

    // ================== NFT FUNCTIONS ==================

    // ✅ Nạp NFT vào contract
    function depositNFT(address nftContract, uint256 tokenId) external {
        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);
        userNFTs[msg.sender][nftContract].push(tokenId);

        emit NFTDeposited(msg.sender, nftContract, tokenId);
    }

    // ✅ Rút NFT khỏi contract
    function withdrawNFT(address nftContract, uint256 tokenId) external {
        require(_isNFTDeposited(msg.sender, nftContract, tokenId), "NFT not deposited");

        _removeNFT(msg.sender, nftContract, tokenId);
        IERC721(nftContract).transferFrom(address(this), msg.sender, tokenId);

        emit NFTWithdrawn(msg.sender, nftContract, tokenId);
    }

    // ✅ Lấy danh sách NFT user đã nạp cho một loại NFT cụ thể
    function getUserNFTs(address user, address nftContract) external view returns (uint256[] memory) {
        return userNFTs[user][nftContract];
    }

    // ✅ Kiểm tra user có sở hữu một NFT cụ thể không
    function hasUserNFT(address user, address nftContract, uint256 tokenId) external view returns (bool) {
        return _isNFTDeposited(user, nftContract, tokenId);
    }

    // 📌 Kiểm tra NFT có được gửi vào contract không
    function _isNFTDeposited(address user, address nftContract, uint256 tokenId) internal view returns (bool) {
        uint256[] memory tokens = userNFTs[user][nftContract];
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == tokenId) {
                return true;
            }
        }
        return false;
    }

    // 📌 Xóa NFT khỏi danh sách khi rút ra
    function _removeNFT(address user, address nftContract, uint256 tokenId) internal {
        uint256[] storage tokens = userNFTs[user][nftContract];
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == tokenId) {
                tokens[i] = tokens[tokens.length - 1]; // Swap với phần tử cuối
                tokens.pop();
                break;
            }
        }
    }

    // ================== EVENTS ==================

    event TokenDeposited(address indexed user, address indexed token, uint256 amount);
    event TokenWithdrawn(address indexed user, address indexed token, uint256 amount);
    event NFTDeposited(address indexed user, address indexed nftContract, uint256 tokenId);
    event NFTWithdrawn(address indexed user, address indexed nftContract, uint256 tokenId);
}
