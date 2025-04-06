// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
import "src/AssetsVault.sol";
import "src/Token.sol";

contract MockERC20 is ERC20 {
    constructor() ERC20("Mock Token", "MTOKEN") {
        _mint(msg.sender, 1_000_000 * 10**18);
    }
}

contract MockERC721 is ERC721 {
    uint256 private _nextTokenId;

    constructor() ERC721("Mock NFT", "MNFT") {
    }

    function mint(address to) external {
        _safeMint(to, _nextTokenId);
        _nextTokenId++;
    }
}

contract AssetsVaultTest is Test {
    AssetsVault vault;
    MockERC20 token;
    MyToken customToken;
    MockERC721 nft;

    address user;
    address admin;

    function setUp() public {
        admin = address(this);
        vault = new AssetsVault();
        token = new MockERC20();
        customToken = new MyToken("Custom Token", "CTKN", 1000);
        nft = new MockERC721();

        user = address(0x123);

        token.transfer(user, 1000 * 10**18);
        customToken.transfer(user, 500 * 10**18);
        
        // Add tokens to supported list
        vault.addSupportedToken(address(token));
        vault.addSupportedToken(address(customToken));
    }

    function testDepositToken() public {
        vm.startPrank(user);

        token.approve(address(vault), 100 * 10**18);
        vault.depositToken(address(token), 100 * 10**18);
        assertEq(vault.tokenBalances(user, address(token)), 100 * 10**18);
        vm.stopPrank();
    }

    function testWithdrawToken() public {
        vm.startPrank(user);
        token.approve(address(vault), 100 * 10**18);
        vault.depositToken(address(token), 100 * 10**18);

        vault.withdrawToken(address(token), 50 * 10**18);
        assertEq(vault.tokenBalances(user, address(token)), 50 * 10**18);
        vm.stopPrank();
    }

    function testGetUserTokenBalance() public {
        vm.startPrank(user);
        token.approve(address(vault), 100 * 10**18);
        customToken.approve(address(vault), 50 * 10**18);
        
        vault.depositToken(address(token), 100 * 10**18);
        vault.depositToken(address(customToken), 50 * 10**18);
        
        uint256 tokenBalance = vault.getUserTokenBalance(user, address(token));
        uint256 customTokenBalance = vault.getUserTokenBalance(user, address(customToken));
        
        assertEq(tokenBalance, 100 * 10**18);
        assertEq(customTokenBalance, 50 * 10**18);
        vm.stopPrank();
    }

    function testTokenBalanceAfterDeposit() public {
        // Kiểm tra số dư ban đầu
        assertEq(vault.tokenBalances(user, address(token)), 0);
        assertEq(vault.tokenBalances(user, address(customToken)), 0);
        
        // Deposit token vào vault
        vm.startPrank(user);
        token.approve(address(vault), 100 * 10**18);
        vault.depositToken(address(token), 100 * 10**18);
        
        // Kiểm tra số dư sau khi deposit
        assertEq(vault.tokenBalances(user, address(token)), 100 * 10**18);
        assertEq(token.balanceOf(address(vault)), 100 * 10**18);
        assertEq(token.balanceOf(user), 900 * 10**18);
        
        // Deposit token thứ hai
        customToken.approve(address(vault), 75 * 10**18);
        vault.depositToken(address(customToken), 75 * 10**18);
        
        // Kiểm tra số dư token thứ hai
        assertEq(vault.tokenBalances(user, address(customToken)), 75 * 10**18);
        assertEq(customToken.balanceOf(address(vault)), 75 * 10**18);
        assertEq(customToken.balanceOf(user), 425 * 10**18);
        
        // Kiểm tra lại bằng hàm getUserTokenBalance
        assertEq(vault.getUserTokenBalance(user, address(token)), 100 * 10**18);
        assertEq(vault.getUserTokenBalance(user, address(customToken)), 75 * 10**18);
        vm.stopPrank();
    }

    function testGetAllSupportedTokens() public {
        address[] memory supportedTokens = vault.getAllSupportedTokens();
        assertEq(supportedTokens.length, 2);
        assertEq(supportedTokens[0], address(token));
        assertEq(supportedTokens[1], address(customToken));
    }

    function testDepositNFT() public {
        vm.startPrank(user);
        nft.mint(user);
        nft.approve(address(vault), 0);
        vault.depositNFT(address(nft), 0);

        assertEq(nft.ownerOf(0), address(vault));
        vm.stopPrank();
    }

    function testWithdrawNFT() public {
        vm.startPrank(user);
        nft.mint(user);
        nft.approve(address(vault), 0);
        vault.depositNFT(address(nft), 0);
        vault.withdrawNFT(address(nft), 0);
        assertEq(nft.ownerOf(0), user);
        vm.stopPrank();
    }

    function testGetUserNFTs() public {
        vm.startPrank(user);
        nft.mint(user);
        nft.mint(user);
        nft.approve(address(vault), 0);
        nft.approve(address(vault), 1);
        
        vault.depositNFT(address(nft), 0);
        vault.depositNFT(address(nft), 1);
        
        uint256[] memory userNFTs = vault.getUserNFTs(user, address(nft));
        assertEq(userNFTs.length, 2);
        assertEq(userNFTs[0], 0);
        assertEq(userNFTs[1], 1);
        vm.stopPrank();
    }

    function testHasUserNFT() public {
        vm.startPrank(user);
        nft.mint(user);
        nft.approve(address(vault), 0);
        vault.depositNFT(address(nft), 0);
        
        bool hasNFT = vault.hasUserNFT(user, address(nft), 0);
        assertEq(hasNFT, true);
        
        bool hasNonExistentNFT = vault.hasUserNFT(user, address(nft), 1);
        assertEq(hasNonExistentNFT, false);
        vm.stopPrank();
    }

    function testAddSupportedToken() public {
        address newToken = address(0xABC);
        vault.addSupportedToken(newToken);
        
        address[] memory supportedTokens = vault.getAllSupportedTokens();
        assertEq(supportedTokens.length, 3);
        assertEq(supportedTokens[2], newToken);
    }

    function testOnlyOwnerCanAddSupportedToken() public {
        address newToken = address(0xABC);
        
        vm.startPrank(user);
        vm.expectRevert("Ownable: caller is not the owner");
        vault.addSupportedToken(newToken);
        vm.stopPrank();
    }
}