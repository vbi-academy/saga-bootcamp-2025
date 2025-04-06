## Quy trình Gửi và Rút Token

### Quy trình Gửi Token
1. **User Approval**: Người dùng phê duyệt token ERC-20 cho hợp đồng **AssetsVault** để chi tiêu một số lượng token nhất định thay mặt cho họ.
2. **Deposit Token**: Người dùng gọi hàm ``depositToken(token, amount)`` trên hợp đồng **AssetsVault**, chỉ định token và số lượng họ muốn gửi.
3. **Transfer from User**: Hợp đồng **AssetsVault** gọi ``transferFrom(user, contract)`` để chuyển số lượng token đã chỉ định từ tài khoản của người dùng sang hợp đồng.
4. **Update Token Balance**: Hợp đồng cập nhật bản đồ nội bộ của nó về số dư token để phản ánh việc gửi mới.
5. **Emit TokenDeposited Event**: Hợp đồng phát ra sự kiện ``TokenDeposited`` để thông báo rằng một giao dịch gửi đã xảy ra.

### Quy trình Rút Token
1. **User Request**: Người dùng yêu cầu rút token từ hợp đồng **AssetsVault**.
2. **Check Balance**: Hợp đồng kiểm tra số dư của người dùng cho token đã chỉ định bằng cách sử dụng ``tokenBalances[user][token]``.
3. **Transfer Tokens Back**: Nếu người dùng có đủ số dư, hợp đồng sẽ chuyển token trở lại tài khoản của người dùng.
4. **Emit TokenWithdrawn Event**: Hợp đồng phát ra sự kiện ``TokenWithdrawn`` để thông báo rằng một giao dịch rút đã xảy ra.

### Hình ảnh Minh họa
┌──────────────┐      approve      ┌──────────────┐  
│     User     │ ─────────────────>│  ERC-20 Token │  
└──────────────┘                    └──────────────┘  
       │                                  │  
       │ depositToken(token, amount)      │  
       ├────────────────────────────────>│  
       │                                  │  
       │ transferFrom(user, contract)     │  
       ├────────────────────────────────>│  
       │                                  │  
       │ Update tokenBalances             │  
       ├────────────────────────────────>│  
       │ Emit TokenDeposited Event        │  
       └────────────────────────────────>│  

--------------------------------------

┌──────────────┐      withdrawToken       ┌──────────────┐  
│     User     │ ───────────────────────> │  AssetVault  │  
└──────────────┘                          └──────────────┘  
       │                                        │  
       │ Check tokenBalances[user][token]       │  
       ├──────────────────────────────────────> │  
       │ Transfer tokens back to user           │  
       ├──────────────────────────────────────> │  
       │ Emit TokenWithdrawn Event              │  
       └──────────────────────────────────────> │  


### Quy trình Gửi NFT
1. **User Approval**: Người dùng phê duyệt NFT cho hợp đồng **AssetsVault** để chi tiêu một số lượng NFT nhất định thay mặt cho họ.
2. **Deposit NFT**: Người dùng gọi hàm ``depositNFT(nft, tokenId)`` trên hợp đồng **AssetsVault**, chỉ định NFT và ID của nó mà họ muốn gửi.
3. **Transfer from User**: Hợp đồng **AssetsVault** gọi ``transferFrom(user, contract, tokenId)`` để chuyển NFT đã chỉ định từ tài khoản của người dùng sang hợp đồng.
4. **Update NFT Balance**: Hợp đồng cập nhật bản đồ nội bộ của nó về số dư NFT để phản ánh việc gửi mới.
5. **Emit NFTDeposited Event**: Hợp đồng phát ra sự kiện ``NFTDeposited`` để thông báo rằng một giao dịch gửi NFT đã xảy ra.

### Quy trình Rút NFT
1. **User Request**: Người dùng yêu cầu rút NFT từ hợp đồng **AssetsVault**.
2. **Check Ownership**: Hợp đồng kiểm tra quyền sở hữu của người dùng cho NFT đã chỉ định bằng cách sử dụng ``nftBalances[user][nft][tokenId]``.
3. **Transfer NFT Back**: Nếu người dùng là chủ sở hữu, hợp đồng sẽ chuyển NFT trở lại tài khoản của người dùng.
4. **Emit NFTWithdrawn Event**: Hợp đồng phát ra sự kiện ``NFTWithdrawn`` để thông báo rằng một giao dịch rút NFT đã xảy ra.

### Hình ảnh Minh họa
┌──────────────┐      approve      ┌──────────────┐  
│     User     │ ─────────────────>│  NFT        │  
└──────────────┘                    └──────────────┘  
       │                                  │  
       │ depositNFT(nft, tokenId)         │  
       ├────────────────────────────────>│  
       │                                  │  
       │ transferFrom(user, contract, tokenId) │  
       ├────────────────────────────────>│  
       │                                  │  
       │ Update nftBalances               │  
       ├────────────────────────────────>│  
       │ Emit NFTDeposited Event          │  
       └────────────────────────────────>│  

--------------------------------------

┌──────────────┐      withdrawNFT       ┌──────────────┐  
│     User     │ ───────────────────────> │  AssetVault  │  
└──────────────┘                          └──────────────┘  
       │                                        │  
       │ Check nftBalances[user][nft][tokenId] │  
       ├──────────────────────────────────────> │  
       │ Transfer NFT back to user              │  
       ├──────────────────────────────────────> │  
       │ Emit NFTWithdrawn Event                 │  
       └──────────────────────────────────────> │  
