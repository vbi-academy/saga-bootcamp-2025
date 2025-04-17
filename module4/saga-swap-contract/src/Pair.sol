// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

contract Pair is ERC20 {

    address public token0;
    address public token1;
    uint private reserve0;
    uint private reserve1;

    event Mint(address indexed sender, uint amount0, uint amount1);
    event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address to);

    constructor(string memory name_, string memory symbol_, address _token0, address _token1) ERC20(name_, symbol_) {
        token0 = _token0;
        token1 = _token1;
    }

    function _update(uint balance0, uint balance1) private {
        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
    }

    function mint(address to) external returns (uint liquidity) {

        uint balance0 = IERC20(token0).balanceOf(address(this));
        uint balance1 = IERC20(token1).balanceOf(address(this));

        uint amount0 = balance0 - reserve0;
        uint amount1 = balance1 - reserve1;

        liquidity = sqrt(amount0 * amount1);

        _mint(to, liquidity);

        _update(balance0, balance1);

        emit Mint(to, amount0, amount1);
    }

    function swap(uint amount0Out, uint amount1Out, address to) external {
        require(amount0Out > 0 || amount1Out > 0, "PAIR: INSUFFICIENT_OUTPUT");

        require(to != token0 && to != token1, "PAIR: INVALID_TO");

        uint _reserve0 = reserve0;
        uint _reserve1 = reserve1;

        require(amount0Out < _reserve0 && amount1Out < _reserve1, "PAIR: INSUFFIENT_LP");

        if (amount0Out > 0) IERC20(token0).transfer(to, amount0Out);
        if (amount1Out > 0) IERC20(token1).transfer(to, amount1Out);

        uint balance0 = IERC20(token0).balanceOf(address(this));
        uint balance1 = IERC20(token1).balanceOf(address(this));

        uint amount0In = balance0 > (_reserve0 - amount0Out) ? balance0 - (_reserve0 - amount0Out) : 0;
        uint amount1In = balance1 > (_reserve1 - amount1Out) ? balance1 - (_reserve1 - amount1Out) : 0;
        

        require(amount0In > 0 || amount1In > 0, "PAIR: INSUFFICENT_INPUT");

        _update(balance0, balance1);

        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }

    function sqrt(uint x) internal pure returns (uint) {
        uint z = (x + 1) / 2;
        uint y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }

    function getReserves() external view returns(uint, uint) {
        return (reserve0, reserve1);
    }

}