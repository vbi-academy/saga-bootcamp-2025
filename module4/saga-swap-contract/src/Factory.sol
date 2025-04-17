// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "./Pair.sol";

contract Factory {
    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    event PairCreated(address indexed token0, address indexed token1, address pair, uint);

    function createPair(address tokenA, address tokenB) external returns (address pair) {
       require(tokenA != tokenB, "Factory: IDENTICAL_ADDRESSES");

       (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);

       require(token0 != address(0), "Factory: ZERO_ADDRESS");
       require(token1 != address(0), "Factory: ZERO_ADDRESS");

       pair = address(new Pair("Liquidity Pool", "LP", token0, token1));

       getPair[token0][token1] = pair;
       getPair[token1][token0] = pair;
       allPairs.push(pair);

       emit PairCreated(token0, token1, pair, allPairs.length);
    }
}