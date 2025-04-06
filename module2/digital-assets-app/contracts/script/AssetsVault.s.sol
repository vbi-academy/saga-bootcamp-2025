import "forge-std/Script.sol";
import "../src/AssetsVault.sol";

contract DeployAssetsVault is Script {
    function run() external {
        vm.startBroadcast(); // Start broadcasting the transaction
        AssetsVault assetsVault = new AssetsVault(); // Deploy the AssetsVault contract
        vm.stopBroadcast(); // Stop broadcasting the transaction
    }
}

