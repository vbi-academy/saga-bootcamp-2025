import "forge-std/Script.sol";
import "../src/Token.sol";

contract DeployToken is Script {
    function run() external {
        uint256 initialSupply = 1_000_000; // Set the initial supply
        vm.startBroadcast(); // Bắt đầu broadcast
        MyToken token = new MyToken("MyToken", "MTK", initialSupply);
        vm.stopBroadcast(); // Dừng broadcast
    }
}   
