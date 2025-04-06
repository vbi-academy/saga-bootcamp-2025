## Một 
### Mô tả bài toán: Quản Lý Tài Sản Số Trên Blockchain
Trong hệ sinh thái Web3, người dùng sở hữu nhiều loại tài sản số như NFT, token và các tài sản on-chain khác. Tuy nhiên, việc quản lý, giao dịch và xác minh quyền sở hữu của những tài sản này thường gặp nhiều thách thức, đặc biệt là về bảo mật, tính minh bạch và trải nghiệm người dùng.

### Yêu cầu bài toán:
Xây dựng một dApp cho phép người dùng dễ dàng quản lý tài sản số của họ, bao gồm:

* Lưu trữ & hiển thị tài sản: Người dùng có thể xem danh sách NFT và token mà họ sở hữu.
* Chuyển & nhận tài sản: Cho phép gửi NFT hoặc token đến địa chỉ khác một cách an toàn.
* Xác minh quyền sở hữu: Hỗ trợ truy vấn blockchain để kiểm tra quyền sở hữu tài sản.
Tương tác với hợp đồng thông minh: Cung cấp khả năng mint, burn hoặc stake NFT/token theo nhu cầu.
* Bảo mật & quyền riêng tư: Đảm bảo tài sản chỉ có thể được quản lý bởi chủ sở hữu hợp pháp thông qua ví cá nhân.

## Môi trường và Công cụ Phát triển Smart Contract

Xin chào mọi người! Hôm nay, trong bài học này, mình sẽ giới thiệu đến các bạn hai công cụ quan trọng để phát triển smart contract - Cursor và Foundry. Đây là những công cụ mạnh mẽ giúp quá trình lập trình smart contract trở nên hiệu quả và chuyên nghiệp hơn. 🛠️

Tại sao chọn Cursor và Foundry?
- Cursor là một IDE thông minh được tích hợp AI, giúp việc viết code trở nên nhanh chóng và chính xác hơn. Với khả năng gợi ý code và debug thông minh, Cursor là lựa chọn tuyệt vời cho các developer Solidity.
- Foundry là bộ công cụ phát triển smart contract toàn diện, cung cấp môi trường test, deploy và debug contract. Được viết bằng Rust, Foundry mang lại hiệu suất cao và độ tin cậy trong quá trình phát triển.


### Hướng dẫn tạo contract ERC20 trên Foundry

Để tạo một contract ERC20 trên Foundry, bạn cần thực hiện các bước sau:

1. **Cài đặt Foundry**: Nếu bạn chưa cài đặt Foundry, hãy làm theo hướng dẫn tại [Foundry Book](https://book.getfoundry.sh/).

2. **Tạo một dự án mới**:
   ```bash
   forge init my-erc20-project
   cd my-erc20-project
   ```

3. **Tạo contract ERC20**: Tạo một file mới trong thư mục `src` với tên `MyToken.sol` và thêm mã sau:
   ```solidity
   // SPDX-License-Identifier: MIT
   pragma solidity ^0.8.0;

   import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

   contract MyToken is ERC20 {
       constructor(uint256 initialSupply) ERC20("MyToken", "MTK") {
           _mint(msg.sender, initialSupply);
       }
   }
   ```

4. **Viết file test**: Tạo một file mới trong thư mục `test` với tên `MyToken.t.sol` và thêm mã sau:
   ```solidity
   // SPDX-License-Identifier: MIT
   pragma solidity ^0.8.0;

   import "forge-std/Test.sol";
   import "../src/MyToken.sol";

   contract MyTokenTest is Test {
       MyToken token;

       function setUp() public {
           token = new MyToken(1000 * 10 ** 18); // Khởi tạo với 1000 token
       }

       function testInitialSupply() public {
           assertEq(token.totalSupply(), 1000 * 10 ** 18);
       }

       function testTransfer() public {
           token.transfer(address(1), 100 * 10 ** 18);
           assertEq(token.balanceOf(address(1)), 100 * 10 ** 18);
       }
   }
   ```

5. **Chạy test**: Để chạy các bài test, sử dụng lệnh sau:
   ```bash
   forge test
   ```

Với các bước trên, bạn đã tạo thành công một contract ERC20 và viết file test cho nó trên Foundry. Chúc bạn thành công trong việc phát triển smart contract của mình! 

