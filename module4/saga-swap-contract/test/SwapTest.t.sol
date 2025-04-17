// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Factory.sol";
import "../src/Router.sol";
import "../src/Pair.sol";

contract ERC20Mock is IERC20 {
    string public name;
    string public symbol;
    uint8 public decimals = 18;
    uint public override totalSupply;
    mapping(address => uint) public override balanceOf;
    mapping(address => mapping(address => uint)) public override allowance;

    constructor(string memory _name, string memory _symbol, uint _supply) {
        name = _name;
        symbol = _symbol;
        totalSupply = _supply;
        balanceOf[msg.sender] = _supply;
    }

    function transfer(address recipient, uint amount) external override returns (bool) {
        require(balanceOf[msg.sender] >= amount, "ERC20: insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[recipient] += amount;
        emit Transfer(msg.sender, recipient, amount);
        return true;
    }

    function approve(address spender, uint amount) external override returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint amount) external override returns (bool) {
        require(allowance[sender][msg.sender] >= amount, "ERC20: insufficient allowance");
        require(balanceOf[sender] >= amount, "ERC20: insufficient balance");
        balanceOf[sender] -= amount;
        balanceOf[recipient] += amount;
        allowance[sender][msg.sender] -= amount;
        emit Transfer(sender, recipient, amount);
        return true;
    }
}

contract SwapTest is Test {
    Factory factory;
    Router router;
    ERC20Mock tokenA;
    ERC20Mock tokenB;
    ERC20Mock tokenC;
    address pairAB;
    address pairBC;
    address user = address(0x123);

    function setUp() public {

        factory = new Factory();
        router = new Router(address(factory));
        tokenA = new ERC20Mock("TokenA", "TKA", 1000 ether);
        tokenB = new ERC20Mock("TokenB", "TKB", 1000 ether);
        tokenC = new ERC20Mock("TokenC", "TKC", 1000 ether);

        pairAB = factory.createPair(address(tokenA), address(tokenB));
        pairBC = factory.createPair(address(tokenB), address(tokenC));

        tokenA.transfer(user, 500 ether);
        tokenB.transfer(user, 500 ether);
        tokenC.transfer(user, 500 ether);

    }

    function testAddLiquidityAB() public {

        vm.startPrank(user);

        uint balanceA = tokenA.balanceOf(user);
        uint balanceB = tokenB.balanceOf(user);

        assertEq(balanceA, 500 ether, "Not expected");
        assertEq(balanceB, 500 ether, "Not expected");

        tokenA.approve(address(router), 1000 ether);
        tokenB.approve(address(router), 1000 ether);

        router.addLiquidity(address(tokenA), address(tokenB), 100 ether, 400 ether);

        uint pairBalance = IERC20(pairAB).balanceOf(user);

        assertEq(pairBalance, 200 ether, "LP not matching");

        vm.stopPrank();

    }

    function testSwapAB() public {
        tokenA.approve(address(router), 1000 ether);
        tokenB.approve(address(router), 1000 ether);

        router.addLiquidity(address(tokenA), address(tokenB), 100 ether, 200 ether);

        assertEq(tokenA.balanceOf(pairAB), 100 ether);
        assertEq(tokenB.balanceOf(pairAB), 200 ether);
        
        uint balanceBefore = tokenB.balanceOf(user);

        router.swap(address(tokenA), address(tokenB), 10 ether, 1 ether, user);

        uint balanceAfter = tokenB.balanceOf(user);

        assertEq(balanceAfter - balanceBefore, 18132217877602982631);
    }

    function testSwapExactAC() public {
        tokenA.approve(address(router), 1000 ether);
        tokenB.approve(address(router), 1000 ether);
        tokenC.approve(address(router), 1000 ether);

        router.addLiquidity(address(tokenA), address(tokenB), 100 ether, 200 ether);
        router.addLiquidity(address(tokenB), address(tokenC), 200 ether, 150 ether);
        

        assertEq(tokenA.balanceOf(pairAB), 100 ether);
        assertEq(tokenB.balanceOf(pairAB), 200 ether);
        assertEq(tokenB.balanceOf(pairBC), 200 ether);
        assertEq(tokenC.balanceOf(pairBC), 150 ether);

        // setup path A -> B -> C
        address[] memory path = new address[](3);
        path[0] = address(tokenA);
        path[1] = address(tokenB);
        path[2] = address(tokenC);

        tokenA.approve(address(router), 100 ether);

        uint balanceBefore = tokenC.balanceOf(user);

        // swap A -> B -> C
        router.swapExactTokensForTokens(10 ether, 1 ether, path, user);

        uint balanceAfter = tokenC.balanceOf(user);

        uint received = balanceAfter - balanceBefore;

        assertEq(received, 10 ether);

    }
}


// pool AB, pool AC 

// AB -> amountOut = 18,13

18075 * 150 / (200 * 1000) + 18075 218075