## Tạo Smart Contract ERC721 và Deploy lên Chainlet

Xin chào mọi người! Hôm nay, trong bài học này, mình sẽ hướng dẫn các bạn cách tạo một smart contract và deploy nó lên mạng lưới Chainlet của mình. Đây là một quy trình quan trọng giúp bạn có thể triển khai ứng dụng quản lý tài sản số của mình một cách hiệu quả. 🛠️

### Các bước thực hiện:
1. **Cài đặt môi trường**: Đảm bảo bạn đã cài đặt các công cụ cần thiết như Cursor và Foundry.
2. **Tạo smart contract**: Sử dụng Cursor để viết mã cho smart contract của bạn.
3. **Deploy lên Chainlet**: Sử dụng Foundry để deploy smart contract lên mạng lưới Chainlet, đảm bảo rằng bạn đã cấu hình đúng các thông số cần thiết.


### Hướng dẫn tạo contract ERC721 và deploy lên chainlet

Để tạo một contract ERC721 trên Foundry, bạn cần thực hiện các bước sau:

1. **Cài đặt Foundry**: Nếu bạn chưa cài đặt Foundry, hãy làm theo hướng dẫn tại [Foundry Book](https://book.getfoundry.sh/).

2. **Tạo một dự án mới**:
   ```bash
   forge init my-erc721-project
   cd my-erc721-project
   ```

3. **Tạo contract ERC721**: Tạo một file mới trong thư mục `src` với tên `MyNFT.sol` và thêm mã sau:
   ```solidity
   // SPDX-License-Identifier: MIT
   pragma solidity ^0.8.19;

   import "openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
   import "openzeppelin-contracts/contracts/access/Ownable.sol";

   contract MyNFT is ERC721, Ownable {
       uint256 private _nextTokenId;

       constructor() ERC721("MyNFT", "MNFT") {}

       function mint(address to) external onlyOwner {
           _safeMint(to, _nextTokenId);
           _nextTokenId++;
       }
   }
   ```

4. **Viết file test**: Tạo một file mới trong thư mục `test` với tên `MyNFT.t.sol` và thêm mã sau:
   ```solidity
   // SPDX-License-Identifier: MIT
   pragma solidity ^0.8.0;

   import "forge-std/Test.sol";
   import "../src/MyNFT.sol";

   contract MyNFTTest is Test {
       MyNFT nft;

       function setUp() public {
           nft = new MyNFT(); // Khởi tạo contract NFT
       }

       function testMintNFT() public {
           nft.mintNFT(address(this)); // Mint NFT cho địa chỉ này
           assertEq(nft.ownerOf(0), address(this)); // Kiểm tra chủ sở hữu của tokenId 0
       }
   }
   ```

5. **Chạy test**: Để chạy các bài test, sử dụng lệnh sau:
   ```bash
   forge test
   ```

6. **Deploy**: Deploy lên chainlet của bạn
    ```bash
    forge script script/MyNFT.s.sol:MyNFTScript --rpc-url <rpc-your_chainlet> --private-key <your_private_key> --broadcast --chain <your_chainlet_id>
    ```



Với các bước trên, bạn sẽ có thể tạo và triển khai smart contract của mình một cách dễ dàng và nhanh chóng.
