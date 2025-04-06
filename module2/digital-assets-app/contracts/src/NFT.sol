// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "openzeppelin-contracts/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "openzeppelin-contracts/contracts/access/Ownable.sol";

contract MyNFT is ERC721URIStorage, Ownable {
    uint256 private _tokenIds;

    constructor() ERC721("MyNFT", "MNFT") {}

    function mintNFT(string memory tokenURI) public returns (uint256) {
        _tokenIds++;
        uint256 newItemId = _tokenIds;
        
        _safeMint(msg.sender, newItemId);
        _setTokenURI(newItemId, tokenURI);

        return newItemId;
    }

function getNFTsByOwner(address owner) public view returns (uint256[] memory, string[] memory) {
    uint256 ownerTokenCount = balanceOf(owner);
    uint256[] memory ownedTokenIds = new uint256[](ownerTokenCount);
    string[] memory ownedTokenURIs = new string[](ownerTokenCount);
    uint256 currentIndex = 0;

    for (uint256 i = 1; i <= _tokenIds; i++) {
        if (ownerOf(i) == owner) {
            ownedTokenIds[currentIndex] = i;
            ownedTokenURIs[currentIndex] = tokenURI(i);
            currentIndex++;
        }
    }

    return (ownedTokenIds, ownedTokenURIs);
}
}
