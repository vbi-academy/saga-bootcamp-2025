// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/Token.sol";
import "../src/NFT.sol";

contract TokenNFTTest is Test {
    MyToken token;
    MyNFT nft;
    address user = address(0x123);

    function setUp() public {
        token = new MyToken();
        nft = new MyNFT();
    }

    // ======== TEST TOKEN (ERC20) ========

    function testInitialSupply() public {
        assertEq(token.totalSupply(), 1_000_000 * 10 ** token.decimals());
    }

    function testMintToken() public {
        token.mint(user, 1000 * 10 ** token.decimals());
        assertEq(token.balanceOf(user), 1000 * 10 ** token.decimals());
    }

    // ======== TEST NFT (ERC721) ========

    function testMintNFT() public {
        nft.mint(user);
        assertEq(nft.ownerOf(0), user);
    }

    // function testFailMintUnauthorized() public {
    //     vm.prank(user);
    //     nft.mint(user); // Lệnh này sẽ fail vì chỉ owner mới được mint
    // }
}
