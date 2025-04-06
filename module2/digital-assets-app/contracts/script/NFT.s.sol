import "forge-std/Script.sol";
import "../src/NFT.sol";

contract DeployNFT is Script {
    function run() external {
        vm.startBroadcast(); // Start broadcasting the deployment
        MyNFT nft = new MyNFT(); // Deploy the MyNFT contract
        vm.stopBroadcast(); // Stop broadcasting
    }
}
