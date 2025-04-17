"use client";

import { useState, useEffect } from "react";
import { Button, Card, Input, Form, Typography, Divider, message, Spin, Row, Col, Alert } from "antd";
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt, usePublicClient } from "wagmi";
import { parseUnits, formatUnits, isAddress } from "viem";
import { PlusOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

// ABI của Router contract
const ROUTER_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "tokenA", "type": "address" },
      { "internalType": "address", "name": "tokenB", "type": "address" },
      { "internalType": "uint256", "name": "amountA", "type": "uint256" },
      { "internalType": "uint256", "name": "amountB", "type": "uint256" }
    ],
    "name": "addLiquidity",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// ABI của ERC20 token
const ERC20_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "spender", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI của Factory contract
const FACTORY_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "tokenA", "type": "address" },
      { "internalType": "address", "name": "tokenB", "type": "address" }
    ],
    "name": "getPair",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI của Pair contract
const PAIR_ABI = [
  {
    "inputs": [],
    "name": "getReserves",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" },
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "token0",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "token1",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// Địa chỉ của Router và Factory contract
const ROUTER_ADDRESS = process.env.NEXT_PUBLIC_ROUTER_ADDRESS; // Thay bằng địa chỉ thực của Router
const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS; // Thay bằng địa chỉ thực của Factory


export default function AddLiquidity() {
  const { address } = useAccount();
  const [form] = Form.useForm();
  
  // Token addresses
  const [tokenAAddress, setTokenAAddress] = useState("");
  const [tokenBAddress, setTokenBAddress] = useState("");
  
  // Token info
  const [tokenA, setTokenA] = useState(null);
  const [tokenB, setTokenB] = useState(null);
  
  // Loading states
  const [loadingTokenA, setLoadingTokenA] = useState(false);
  const [loadingTokenB, setLoadingTokenB] = useState(false);
  
  // Token balances
  const [balanceA, setBalanceA] = useState("0");
  const [balanceB, setBalanceB] = useState("0");
  
  // Error states
  const [errorTokenA, setErrorTokenA] = useState("");
  const [errorTokenB, setErrorTokenB] = useState("");
  
  // Input amounts
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  
  // Transaction states
  const [isApproving, setIsApproving] = useState(false);
  const [isAddingLiquidity, setIsAddingLiquidity] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [approvalTxHash, setApprovalTxHash] = useState(null);
  const [approvalTokenAddress, setApprovalTokenAddress] = useState(null);
  
  // Pair info
  const [pairExists, setPairExists] = useState(false);
  const [pairAddress, setPairAddress] = useState(null);
  const [reserveA, setReserveA] = useState("0");
  const [reserveB, setReserveB] = useState("0");

  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  // Hook để đợi transaction receipt
  const { data: receipt, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
    enabled: Boolean(txHash),
  });

  // Hook để đợi approval transaction receipt
  const { data: approvalReceipt, isSuccess: isApprovalConfirmed } = useWaitForTransactionReceipt({
    hash: approvalTxHash,
    enabled: Boolean(approvalTxHash),
  });

  // Xử lý khi approval transaction hoàn thành
  useEffect(() => {
    if (isApprovalConfirmed && approvalReceipt) {
      const approvedToken = approvalTokenAddress === tokenA?.address ? tokenA : tokenB;
      message.success(`Approved ${approvedToken?.symbol || 'token'} successfully!`);
      setIsApproving(false);
      setApprovalTxHash(null);
      setApprovalTokenAddress(null);
    }
  }, [isApprovalConfirmed, approvalReceipt, tokenA, tokenB, approvalTokenAddress]);

  // Xử lý khi add liquidity transaction hoàn thành
  useEffect(() => {
    if (isConfirmed && receipt) {
      message.success("Liquidity added successfully!");
      setIsAddingLiquidity(false);
      setTxHash(null);
      
      // Reset form
      form.resetFields();
      setAmountA("");
      setAmountB("");
      
      // Refresh pair data
      checkPairExists();
    }
  }, [isConfirmed, receipt, form]);

  // Kiểm tra xem pair có tồn tại không
  const checkPairExists = async () => {
    if (!tokenA?.address || !tokenB?.address) return;
    
    try {
      const pairData = await publicClient.readContract({
        address: FACTORY_ADDRESS,
        abi: FACTORY_ABI,
        functionName: "getPair",
        args: [tokenA.address, tokenB.address],
      });
      
      if (pairData && pairData !== "0x0000000000000000000000000000000000000000") {
        setPairAddress(pairData);
        setPairExists(true);
        fetchReserves(pairData);
      } else {
        setPairAddress(null);
        setPairExists(false);
        setReserveA("0");
        setReserveB("0");
      }
    } catch (error) {
      console.error("Error checking pair:", error);
      setPairExists(false);
    }
  };

  // Lấy reserves từ pair
  const fetchReserves = async (pairAddr) => {
    if (!pairAddr || !tokenA?.address || !tokenB?.address) return;
    
    try {
      const reserves = await publicClient.readContract({
        address: pairAddr,
        abi: PAIR_ABI,
        functionName: "getReserves",
      });

      const token0 = await publicClient.readContract({
        address: pairAddr,
        abi: PAIR_ABI,
        functionName: "token0",
      });

      // Xác định reserves cho tokenA và tokenB
      if (tokenA.address.toLowerCase() === token0.toLowerCase()) {
        setReserveA(formatUnits(reserves[0], tokenA.decimals));
        setReserveB(formatUnits(reserves[1], tokenB.decimals));
      } else {
        setReserveA(formatUnits(reserves[1], tokenA.decimals));
        setReserveB(formatUnits(reserves[0], tokenB.decimals));
      }
    } catch (error) {
      console.error("Error fetching reserves:", error);
    }
  };

  // Lấy thông tin token từ địa chỉ
  const fetchTokenInfo = async (tokenAddress, isTokenA) => {
    if (!isAddress(tokenAddress)) {
      if (isTokenA) {
        setErrorTokenA("Invalid token address");
        setTokenA(null);
      } else {
        setErrorTokenB("Invalid token address");
        setTokenB(null);
      }
      return;
    }

    if (isTokenA) {
      setLoadingTokenA(true);
      setErrorTokenA("");
    } else {
      setLoadingTokenB(true);
      setErrorTokenB("");
    }

    try {
      // Lấy thông tin token
      const [name, symbol, decimals] = await Promise.all([
        publicClient.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: "name",
        }),
        publicClient.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: "symbol",
        }),
        publicClient.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: "decimals",
        }),
      ]);

      const tokenInfo = {
        address: tokenAddress,
        name,
        symbol,
        decimals,
      };

      // Lấy số dư token của người dùng
      if (address) {
        const balance = await publicClient.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [address],
        });

        const formattedBalance = formatUnits(balance, decimals);
        
        if (parseFloat(formattedBalance) <= 0) {
          if (isTokenA) {
            setErrorTokenA(`You don't own any ${symbol} tokens`);
          } else {
            setErrorTokenB(`You don't own any ${symbol} tokens`);
          }
        }

        if (isTokenA) {
          setBalanceA(formattedBalance);
          setTokenA(tokenInfo);
        } else {
          setBalanceB(formattedBalance);
          setTokenB(tokenInfo);
        }
      }
    } catch (error) {
      console.error(`Error fetching token info:`, error);
      if (isTokenA) {
        setErrorTokenA("Invalid ERC20 token or contract error");
        setTokenA(null);
      } else {
        setErrorTokenB("Invalid ERC20 token or contract error");
        setTokenB(null);
      }
    } finally {
      if (isTokenA) {
        setLoadingTokenA(false);
      } else {
        setLoadingTokenB(false);
      }
    }
  };

  // Kiểm tra pair khi cả hai token đã được chọn
  useEffect(() => {
    if (tokenA && tokenB) {
      checkPairExists();
    }
  }, [tokenA, tokenB]);

  // Xử lý khi nhập địa chỉ token A
  const handleTokenAAddressChange = (e) => {
    const address = e.target.value.trim();
    setTokenAAddress(address);
    
    if (address === tokenBAddress) {
      setErrorTokenA("Token A and Token B cannot be the same");
      return;
    }
    
    if (address && address.length === 42) { // Kiểm tra độ dài của địa chỉ Ethereum
      fetchTokenInfo(address, true);
    } else {
      setTokenA(null);
      setBalanceA("0");
      if (address) setErrorTokenA("Invalid address format");
      else setErrorTokenA("");
    }
  };

  // Xử lý khi nhập địa chỉ token B
  const handleTokenBAddressChange = (e) => {
    const address = e.target.value.trim();
    setTokenBAddress(address);
    
    if (address === tokenAAddress) {
      setErrorTokenB("Token A and Token B cannot be the same");
      return;
    }
    
    if (address && address.length === 42) { // Kiểm tra độ dài của địa chỉ Ethereum
      fetchTokenInfo(address, false);
    } else {
      setTokenB(null);
      setBalanceB("0");
      if (address) setErrorTokenB("Invalid address format");
      else setErrorTokenB("");
    }
  };

  // Xử lý khi nhập amount A
  const handleAmountAChange = (e) => {
    const value = e.target.value;
    setAmountA(value);
    
    // Nếu pair tồn tại, tính amount B tương ứng dựa trên tỷ lệ reserves
    if (pairExists && parseFloat(reserveA) > 0 && parseFloat(reserveB) > 0) {
      const amountBValue = (parseFloat(value) * parseFloat(reserveB)) / parseFloat(reserveA);
      setAmountB(amountBValue.toFixed(6));
    }
  };

  // Xử lý khi nhập amount B
  const handleAmountBChange = (e) => {
    const value = e.target.value;
    setAmountB(value);
    
    // Nếu pair tồn tại, tính amount A tương ứng dựa trên tỷ lệ reserves
    if (pairExists && parseFloat(reserveA) > 0 && parseFloat(reserveB) > 0) {
      const amountAValue = (parseFloat(value) * parseFloat(reserveA)) / parseFloat(reserveB);
      setAmountA(amountAValue.toFixed(6));
    }
  };

  // Xử lý khi nhấn nút Max cho token A
  const handleMaxA = () => {
    setAmountA(balanceA);
    
    // Nếu pair tồn tại, tính amount B tương ứng dựa trên tỷ lệ reserves
    if (pairExists && parseFloat(reserveA) > 0 && parseFloat(reserveB) > 0) {
      const amountBValue = (parseFloat(balanceA) * parseFloat(reserveB)) / parseFloat(reserveA);
      setAmountB(amountBValue.toFixed(6));
    }
  };

  // Xử lý khi nhấn nút Max cho token B
  const handleMaxB = () => {
    setAmountB(balanceB);
    
    // Nếu pair tồn tại, tính amount A tương ứng dựa trên tỷ lệ reserves
    if (pairExists && parseFloat(reserveA) > 0 && parseFloat(reserveB) > 0) {
      const amountAValue = (parseFloat(balanceB) * parseFloat(reserveA)) / parseFloat(reserveB);
      setAmountA(amountAValue.toFixed(6));
    }
  };

  // Approve token
  const handleApprove = async (token, amount) => {
    if (!token || !amount || parseFloat(amount) <= 0) {
      message.error("Please enter a valid amount");
      return;
    }

    try {
      setIsApproving(true);
      setApprovalTokenAddress(token.address);
      
      const hash = await writeContractAsync({
        address: token.address,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [ROUTER_ADDRESS, parseUnits(amount, token.decimals)],
      });

      console.log(`Approval transaction sent for ${token.symbol}, hash:`, hash);
      message.loading({ content: `Approving ${token.symbol}...`, key: "approving", duration: 0 });
      
      setApprovalTxHash(hash);
    } catch (error) {
      console.error("Error approving token:", error);
      message.error(`Error approving ${token.symbol}: ${error.message || "Transaction failed"}`);
      setIsApproving(false);
      setApprovalTokenAddress(null);
    }
  };

  // Add liquidity
  const handleAddLiquidity = async () => {
    if (!tokenA || !tokenB || !amountA || !amountB || parseFloat(amountA) <= 0 || parseFloat(amountB) <= 0) {
      message.error("Please select tokens and enter valid amounts");
      return;
    }

    try {
      setIsAddingLiquidity(true);
      message.loading({ content: "Adding liquidity...", key: "adding", duration: 0 });
      
      const hash = await writeContractAsync({
        address: ROUTER_ADDRESS,
        abi: ROUTER_ABI,
        functionName: "addLiquidity",
        args: [
          tokenA.address,
          tokenB.address,
          parseUnits(amountA, tokenA.decimals),
          parseUnits(amountB, tokenB.decimals)
        ],
      });

      console.log("Add liquidity transaction sent, hash:", hash);
      message.loading({ content: "Waiting for confirmation...", key: "adding", duration: 0 });
      
      setTxHash(hash);
    } catch (error) {
      console.error("Error adding liquidity:", error);
      message.destroy("adding");
      message.error(`Error adding liquidity: ${error.message || "Transaction failed"}`);
      setIsAddingLiquidity(false);
    }
  };

  return (
    <Card title="Add Liquidity" style={{ maxWidth: 500, margin: "0 auto" }}>
      <Form form={form} layout="vertical">
        {/* Token A Input */}
        <Form.Item 
          label="Token A Address" 
          validateStatus={errorTokenA ? "error" : ""}
          help={errorTokenA}
        >
          <Input
            placeholder="Enter ERC20 token address"
            value={tokenAAddress}
            onChange={handleTokenAAddressChange}
            disabled={loadingTokenA}
            suffix={loadingTokenA ? <Spin size="small" /> : null}
          />
          
          {tokenA && (
            <div style={{ marginTop: 8, padding: 8, border: '1px solid #f0f0f0', borderRadius: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text strong>{tokenA.name} ({tokenA.symbol})</Text>
                <Text>Balance: {parseFloat(balanceA).toFixed(6)}</Text>
              </div>
              
              <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                <Input
                  placeholder="0.0"
                  value={amountA}
                  onChange={handleAmountAChange}
                  style={{ flex: 1 }}
                />
                <Button type="link" onClick={handleMaxA}>
                  MAX
                </Button>
              </div>
              
              <Button
                type="primary"
                size="small"
                onClick={() => handleApprove(tokenA, amountA)}
                loading={isApproving && approvalTokenAddress === tokenA.address}
                disabled={!amountA || parseFloat(amountA) <= 0 || parseFloat(amountA) > parseFloat(balanceA)}
                block
              >
                Approve {tokenA.symbol}
              </Button>
            </div>
          )}
        </Form.Item>

        {/* Plus Icon */}
        <div style={{ display: "flex", justifyContent: "center", margin: "16px 0" }}>
          <PlusOutlined style={{ fontSize: 24 }} />
        </div>

        {/* Token B Input */}
        <Form.Item 
          label="Token B Address"
          validateStatus={errorTokenB ? "error" : ""}
          help={errorTokenB}
        >
          <Input
            placeholder="Enter ERC20 token address"
            value={tokenBAddress}
            onChange={handleTokenBAddressChange}
            disabled={loadingTokenB}
            suffix={loadingTokenB ? <Spin size="small" /> : null}
          />
          
          {tokenB && (
            <div style={{ marginTop: 8, padding: 8, border: '1px solid #f0f0f0', borderRadius: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text strong>{tokenB.name} ({tokenB.symbol})</Text>
                <Text>Balance: {parseFloat(balanceB).toFixed(6)}</Text>
              </div>
              
              <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                <Input
                  placeholder="0.0"
                  value={amountB}
                  onChange={handleAmountBChange}
                  style={{ flex: 1 }}
                />
                <Button type="link" onClick={handleMaxB}>
                  MAX
                </Button>
              </div>
              
              <Button
                type="primary"
                size="small"
                onClick={() => handleApprove(tokenB, amountB)}
                loading={isApproving && approvalTokenAddress === tokenB.address}
                disabled={!amountB || parseFloat(amountB) <= 0 || parseFloat(amountB) > parseFloat(balanceB)}
                block
              >
                Approve {tokenB.symbol}
              </Button>
            </div>
          )}
        </Form.Item>

        {/* Pool Information */}
        {tokenA && tokenB && (
          <Card size="small" style={{ marginBottom: 16 }}>
            <Title level={5}>Pool Information</Title>
            {pairExists ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Text>Pool Address:</Text>
                  <Text copyable={{ text: pairAddress }}>{`${pairAddress.substring(0, 6)}...${pairAddress.substring(pairAddress.length - 4)}`}</Text>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Text>Reserves:</Text>
                  <Text>{parseFloat(reserveA).toFixed(6)} {tokenA.symbol} / {parseFloat(reserveB).toFixed(6)} {tokenB.symbol}</Text>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Text>Rate:</Text>
                  <Text>1 {tokenA.symbol} = {parseFloat(reserveA) > 0 ? (parseFloat(reserveB) / parseFloat(reserveA)).toFixed(6) : "0"} {tokenB.symbol}</Text>
                </div>
              </>
            ) : (
              <Text>This will be the first liquidity provision. The ratio of tokens you add will set the price of this pool.</Text>
            )}
          </Card>
        )}

        {/* Submit Button */}
        <Form.Item>
          <Button
            type="primary"
            block
            onClick={handleAddLiquidity}
            loading={isAddingLiquidity}
            disabled={
              !tokenA || !tokenB || !amountA || !amountB || 
              parseFloat(amountA) <= 0 || parseFloat(amountB) <= 0 ||
              parseFloat(amountA) > parseFloat(balanceA) || parseFloat(amountB) > parseFloat(balanceB) ||
              isApproving || errorTokenA || errorTokenB
            }
          >
            Add Liquidity
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}