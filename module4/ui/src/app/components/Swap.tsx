"use client";

import React, { useState, useEffect } from "react";
import { Button, Card, Input, Form, Typography, message, Spin, Alert } from "antd";
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt, usePublicClient } from "wagmi";
import { parseUnits, formatUnits, isAddress } from "viem";
import { SwapOutlined, SettingOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

// Định nghĩa các kiểu dữ liệu
interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
}

// ABI của Router contract (chỉ cần swap)
const ROUTER_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "tokenIn", "type": "address" },
      { "internalType": "address", "name": "tokenOut", "type": "address" },
      { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
      { "internalType": "uint256", "name": "amountOutMin", "type": "uint256" },
      { "internalType": "address", "name": "to", "type": "address" }
    ],
    "name": "swap",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

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
] as const;

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
] as const;

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
] as const;

const ROUTER_ADDRESS = process.env.NEXT_PUBLIC_ROUTER_ADDRESS; // Thay bằng địa chỉ thực của Router
const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS; // Thay bằng địa chỉ thực của Factory

export default function Swap() {
  const { address } = useAccount();
  const [form] = Form.useForm();
  
  // Token addresses
  const [tokenInAddress, setTokenInAddress] = useState<string>("");
  const [tokenOutAddress, setTokenOutAddress] = useState<string>("");
  
  // Token info
  const [tokenIn, setTokenIn] = useState<TokenInfo | null>(null);
  const [tokenOut, setTokenOut] = useState<TokenInfo | null>(null);
  
  // Loading states
  const [loadingTokenIn, setLoadingTokenIn] = useState<boolean>(false);
  const [loadingTokenOut, setLoadingTokenOut] = useState<boolean>(false);
  
  // Token balances
  const [balanceIn, setBalanceIn] = useState<string>("0");
  const [balanceOut, setBalanceOut] = useState<string>("0");
  
  // Error states
  const [errorTokenIn, setErrorTokenIn] = useState<string>("");
  const [errorTokenOut, setErrorTokenOut] = useState<string>("");
  
  // Input amounts
  const [amountIn, setAmountIn] = useState<string>("");
  const [amountOut, setAmountOut] = useState<string>("");
  
  // Transaction states
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [isSwapping, setIsSwapping] = useState<boolean>(false);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [approvalTxHash, setApprovalTxHash] = useState<`0x${string}` | null>(null);
  
  // Pair info
  const [pairExists, setPairExists] = useState<boolean>(false);
  const [pairAddress, setPairAddress] = useState<string | null>(null);
  const [reserveIn, setReserveIn] = useState<string>("0");
  const [reserveOut, setReserveOut] = useState<string>("0");
  
  // Slippage settings
  const [slippage, setSlippage] = useState<number>(0.5);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  
  // Price impact
  const [priceImpact, setPriceImpact] = useState<string>("0");

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
      message.success(`Approved ${tokenIn?.symbol || 'token'} successfully!`);
      setIsApproving(false);
      setApprovalTxHash(null);
       // Refresh reserves và tính lại amountOut sau khi approve thành công
       if (pairAddress) {
        fetchReserves(pairAddress);
      }
    }
  }, [isApprovalConfirmed, approvalReceipt, tokenIn, pairAddress]);

  // Xử lý khi swap transaction hoàn thành
  useEffect(() => {
    if (isConfirmed && receipt) {
      message.success("Swap completed successfully!");
      setIsSwapping(false);
      setTxHash(null);
      
      // Reset form
      form.resetFields();
      setAmountIn("");
      setAmountOut("");
      
      // Refresh balances and pair data
      if (tokenIn && tokenOut) {
        fetchTokenBalance(tokenIn.address, true);
        fetchTokenBalance(tokenOut.address, false);
        checkPairExists();
      }
    }
  }, [isConfirmed, receipt, form, tokenIn, tokenOut]);

  // Kiểm tra xem pair có tồn tại không
  const checkPairExists = async (): Promise<void> => {
    if (!tokenIn?.address || !tokenOut?.address) return;
    
    try {
      const pairData = await publicClient.readContract({
        address: FACTORY_ADDRESS,
        abi: FACTORY_ABI,
        functionName: "getPair",
        args: [tokenIn.address as `0x${string}`, tokenOut.address as `0x${string}`],
      });
      
      if (pairData && pairData !== "0x0000000000000000000000000000000000000000") {
        setPairAddress(pairData);
        setPairExists(true);
        fetchReserves(pairData);
      } else {
        setPairAddress(null);
        setPairExists(false);
        setReserveIn("0");
        setReserveOut("0");
        setAmountOut("");
        setErrorTokenOut("No liquidity pool exists for this pair");
      }
    } catch (error) {
      console.error("Error checking pair:", error);
      setPairExists(false);
      setErrorTokenOut("Error checking liquidity pool");
    }
  };

  // Lấy reserves từ pair
  const fetchReserves = async (pairAddr: string): Promise<void> => {
    if (!pairAddr || !tokenIn?.address || !tokenOut?.address) return;
    
    try {
      const reserves = await publicClient.readContract({
        address: pairAddr as `0x${string}`,
        abi: PAIR_ABI,
        functionName: "getReserves",
      });

      const token0 = await publicClient.readContract({
        address: pairAddr as `0x${string}`,
        abi: PAIR_ABI,
        functionName: "token0",
      });

      // Xác định reserves cho tokenIn và tokenOut
      if (tokenIn.address.toLowerCase() === token0.toLowerCase()) {
        setReserveIn(formatUnits(reserves[0], tokenIn.decimals));
        setReserveOut(formatUnits(reserves[1], tokenOut.decimals));
      } else {
        setReserveIn(formatUnits(reserves[1], tokenIn.decimals));
        setReserveOut(formatUnits(reserves[0], tokenOut.decimals));
      }
      
      // Nếu đã có amountIn, tính lại amountOut
      if (amountIn) {
        calculateAmountOut(amountIn);
      }
    } catch (error) {
      console.error("Error fetching reserves:", error);
    }
  };

  // Lấy thông tin token từ địa chỉ - Đã cải thiện xử lý lỗi
  const fetchTokenInfo = async (tokenAddress: string, isTokenIn: boolean): Promise<void> => {
    if (!isAddress(tokenAddress)) {
      if (isTokenIn) {
        setErrorTokenIn("Invalid token address");
        setTokenIn(null);
      } else {
        setErrorTokenOut("Invalid token address");
        setTokenOut(null);
      }
      return;
    }

    if (isTokenIn) {
      setLoadingTokenIn(true);
      setErrorTokenIn("");
    } else {
      setLoadingTokenOut(true);
      setErrorTokenOut("");
    }

    try {
      // Lấy thông tin token với xử lý lỗi
      let name = "Unknown Token";
      let symbol = "???";
      let decimals = 18;
      
      try {
        name = await publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "name",
        });
      } catch (error) {
        console.warn("Error fetching token name:", error);
        // Tiếp tục nếu không có hàm name
      }
      
      try {
        symbol = await publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "symbol",
        });
      } catch (error) {
        console.warn("Error fetching token symbol:", error);
        // Tiếp tục nếu không có hàm symbol
      }
      
      try {
        decimals = await publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "decimals",
        });
      } catch (error) {
        console.warn("Error fetching token decimals:", error);
        // Sử dụng giá trị mặc định là 18
      }

      const tokenInfo: TokenInfo = {
        address: tokenAddress,
        name,
        symbol,
        decimals,
      };

      // Lấy số dư token của người dùng
      if (address) {
        try {
          const balance = await publicClient.readContract({
            address: tokenAddress as `0x${string}`,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [address],
          });

          const formattedBalance = formatUnits(balance, decimals);
          
          if (isTokenIn) {
            setBalanceIn(formattedBalance);
            setTokenIn(tokenInfo);
            
            if (parseFloat(formattedBalance) <= 0) {
              setErrorTokenIn(`You don't own any ${symbol} tokens`);
            }
          } else {
            setBalanceOut(formattedBalance);
            setTokenOut(tokenInfo);
          }
        } catch (error) {
          console.error("Error fetching token balance:", error);
          if (isTokenIn) {
            setErrorTokenIn("Error fetching token balance");
          } else {
            setErrorTokenOut("Error fetching token balance");
          }
        }
      } else {
        // Nếu không có địa chỉ người dùng, vẫn cập nhật thông tin token
        if (isTokenIn) {
          setTokenIn(tokenInfo);
        } else {
          setTokenOut(tokenInfo);
        }
      }
    } catch (error) {
      console.error(`Error fetching token info:`, error);
      if (isTokenIn) {
        setErrorTokenIn("Invalid ERC20 token or contract error");
        setTokenIn(null);
      } else {
        setErrorTokenOut("Invalid ERC20 token or contract error");
        setTokenOut(null);
      }
    } finally {
      if (isTokenIn) {
        setLoadingTokenIn(false);
      } else {
        setLoadingTokenOut(false);
      }
    }
  };

  // Lấy số dư token - Đã cải thiện xử lý lỗi
  const fetchTokenBalance = async (tokenAddress: string, isTokenIn: boolean): Promise<void> => {
    if (!address || !tokenAddress) return;
    
    try {
      let decimals = 18; // Giá trị mặc định
      
      try {
        decimals = await publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "decimals",
        });
      } catch (error) {
        console.warn("Error fetching token decimals:", error);
        // Sử dụng giá trị mặc định
      }
      
      const balance = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [address],
        });
      
      const formattedBalance = formatUnits(balance, decimals);
      
      if (isTokenIn) {
        setBalanceIn(formattedBalance);
      } else {
        setBalanceOut(formattedBalance);
      }
    } catch (error) {
      console.error("Error fetching token balance:", error);
      if (isTokenIn) {
        setBalanceIn("0");
      } else {
        setBalanceOut("0");
      }
    }
  };

  // Kiểm tra pair khi cả hai token đã được chọn
  useEffect(() => {
    if (tokenIn && tokenOut) {
      if (tokenIn.address === tokenOut.address) {
        setErrorTokenOut("Input and output tokens cannot be the same");
        return;
      }
      checkPairExists();
    }
  }, [tokenIn, tokenOut]);

  // Xử lý khi nhập địa chỉ token In
  const handleTokenInAddressChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const address = e.target.value.trim();
    setTokenInAddress(address);
    
    if (address === tokenOutAddress && tokenOutAddress) {
      setErrorTokenIn("Input and output tokens cannot be the same");
      return;
    }
    
    if (address && address.length === 42) { // Kiểm tra độ dài của địa chỉ Ethereum
      fetchTokenInfo(address, true);
    } else {
      setTokenIn(null);
      setBalanceIn("0");
      if (address) setErrorTokenIn("Invalid address format");
      else setErrorTokenIn("");
    }
  };

  // Xử lý khi nhập địa chỉ token Out
  const handleTokenOutAddressChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const address = e.target.value.trim();
    setTokenOutAddress(address);
    
    if (address === tokenInAddress && tokenInAddress) {
      setErrorTokenOut("Input and output tokens cannot be the same");
      return;
    }
    
    if (address && address.length === 42) { // Kiểm tra độ dài của địa chỉ Ethereum
      fetchTokenInfo(address, false);
    } else {
      setTokenOut(null);
      setBalanceOut("0");
      if (address) setErrorTokenOut("Invalid address format");
      else setErrorTokenOut("");
    }
  };

    // Tính amountOut dựa trên amountIn và reserves (tính ở frontend)
    const calculateAmountOut = (): void => {
        if (!pairExists || !tokenIn || !tokenOut || !amountIn || parseFloat(amountIn) <= 0 || parseFloat(reserveIn) <= 0 || parseFloat(reserveOut) <= 0) {
            setAmountOut("");
            return;
        }

        try {
            const amountInNum = parseFloat(amountIn);
            const reserveInNum = parseFloat(reserveIn);
            const reserveOutNum = parseFloat(reserveOut);

            const amountInWithFee = amountInNum * 997;
            const numerator = amountInWithFee * reserveOutNum;
            const denominator = reserveInNum * 1000 + amountInWithFee;
            const amountOutResult = numerator / denominator;

            setAmountOut(amountOutResult.toFixed(6)); // Giữ 6 chữ số thập phân

            // Tính price impact
            const spotPrice = reserveOutNum / reserveInNum;
            const executionPrice = parseFloat(amountOut) / amountInNum;
            const priceImpactValue = ((spotPrice - executionPrice) / spotPrice) * 100;
            setPriceImpact(priceImpactValue.toFixed(2));

        } catch (error) {
            console.error("Error calculating output amount:", error);
            setAmountOut("");
            setPriceImpact("0");
            message.error("Error calculating output amount");
        }
    };

  // Xử lý khi nhập amount In
  const handleAmountInChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    setAmountIn(value);
    calculateAmountOut();
  };

  // Xử lý khi nhấn nút Max cho token In
  const handleMaxIn = (): void => {
    setAmountIn(balanceIn);
    calculateAmountOut();
  };

  // Đổi vị trí token In và token Out
  const handleSwitchTokens = (): void => {
    // Lưu giá trị hiện tại
    const tempTokenIn = tokenIn;
    const tempTokenOut = tokenOut;
    const tempTokenInAddress = tokenInAddress;
    const tempTokenOutAddress = tokenOutAddress;
    const tempBalanceIn = balanceIn;
    const tempBalanceOut = balanceOut;
    
    // Đổi chỗ các giá trị
    setTokenIn(tempTokenOut);
    setTokenOut(tempTokenIn);
    setTokenInAddress(tempTokenOutAddress);
    setTokenOutAddress(tempTokenInAddress);
    setBalanceIn(tempBalanceOut);
    setBalanceOut(tempBalanceIn);
    
    // Reset các giá trị liên quan
    setAmountIn("");
    setAmountOut("");
    setPriceImpact("0");
    
    // Kiểm tra pair mới
    if (tempTokenOut && tempTokenIn) {
      checkPairExists();
    }
  };

  // Approve token - Đã cải thiện xử lý lỗi
  const handleApprove = async (): Promise<void> => {
    if (!tokenIn || !amountIn || parseFloat(amountIn) <= 0) {
      message.error("Please enter a valid amount");
      return;
    }

    try {
      setIsApproving(true);
      
      const hash = await writeContractAsync({
        address: tokenIn.address as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [ROUTER_ADDRESS as `0x${string}`, parseUnits(amountIn, tokenIn.decimals)],
      });

      console.log(`Approval transaction sent for ${tokenIn.symbol}, hash:`, hash);
      message.loading({ content: `Approving ${tokenIn.symbol}...`, key: "approving", duration: 0 });
      
      setApprovalTxHash(hash);
    } catch (error) {
      console.error("Error approving token:", error);
      message.error(`Error approving ${tokenIn.symbol}: ${(error as Error).message || "Transaction failed"}`);
      setIsApproving(false);
    }
  };

  // Swap tokens - Đã cải thiện xử lý lỗi
  const handleSwap = async (): Promise<void> => {
    if (!tokenIn || !tokenOut || !amountIn || !amountOut || parseFloat(amountIn) <= 0 || parseFloat(amountOut) <= 0) {
      message.error("Please select tokens and enter valid amounts");
      return;
    }

    try {
      setIsSwapping(true);
      message.loading({ content: "Swapping tokens...", key: "swapping", duration: 0 });
      
      // Tính amountOutMin dựa trên slippage
      const amountOutValue = parseFloat(amountOut);
      const amountOutMin = amountOutValue * (1 - slippage / 100);
      const amountOutMinWei = parseUnits(amountOutMin.toFixed(tokenOut.decimals), tokenOut.decimals);
      
      const hash = await writeContractAsync({
        address: ROUTER_ADDRESS as `0x${string}`,
        abi: ROUTER_ABI,
        functionName: "swap",
        args: [
          tokenIn.address as `0x${string}`,
          tokenOut.address as `0x${string}`,
          parseUnits(amountIn, tokenIn.decimals),
          amountOutMinWei,
          address as `0x${string}`
        ],
      });

      console.log("Swap transaction sent, hash:", hash);
      message.loading({ content: "Waiting for confirmation...", key: "swapping", duration: 0 });
      
      setTxHash(hash);
    } catch (error) {
      console.error("Error swapping tokens:", error);
      message.destroy("swapping");
      message.error(`Error swapping tokens: ${(error as Error).message || "Transaction failed"}`);
      setIsSwapping(false);
    }
  };

   // UseEffect để tính lại amountOut khi các giá trị liên quan thay đổi
   useEffect(() => {
    if (tokenIn && tokenOut && amountIn && reserveIn && reserveOut && pairExists) {
        calculateAmountOut();
    }
  }, [tokenIn, tokenOut, amountIn, reserveIn, reserveOut, pairExists]);

  return (
    <Card title={
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Swap</span>
        <Button 
          type="text" 
          icon={<SettingOutlined />} 
          onClick={() => setShowSettings(!showSettings)} 
        />
      </div>
    } style={{ maxWidth: 500, margin: "0 auto" }}>
      
      {/* Settings Panel */}
      {showSettings && (
        <Card size="small" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Text>Slippage Tolerance</Text>
            <div>
              <Button.Group>
                <Button 
                  type={slippage === 0.1 ? "primary" : "default"} 
                  size="small" 
                  onClick={() => setSlippage(0.1)}
                >
                  0.1%
                </Button>
                <Button 
                  type={slippage === 0.5 ? "primary" : "default"} 
                  size="small" 
                  onClick={() => setSlippage(0.5)}
                >
                  0.5%
                </Button>
                <Button 
                  type={slippage === 1.0 ? "primary" : "default"} 
                  size="small" 
                  onClick={() => setSlippage(1.0)}
                >
                  1.0%
                </Button>
              </Button.Group>
              <Input 
                size="small" 
                style={{ width: 70, marginLeft: 8 }} 
                suffix="%" 
                value={slippage}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value) && value >= 0) {
                    setSlippage(value);
                  }
                }}
              />
            </div>
          </div>
        </Card>
      )}

      <Form form={form} layout="vertical">
        {/* Token In Input */}
        <Card size="small" style={{ marginBottom: 8 }}>
          <Form.Item 
            label="From" 
            validateStatus={errorTokenIn ? "error" : ""}
            help={errorTokenIn}
            style={{ marginBottom: 0 }}
          >
            <Input
              placeholder="Enter ERC20 token address"
              value={tokenInAddress}
              onChange={handleTokenInAddressChange}
              disabled={loadingTokenIn}
              suffix={loadingTokenIn ? <Spin size="small" /> : null}
              style={{ marginBottom: 8 }}
            />
            
            {tokenIn && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text strong>{tokenIn.name} ({tokenIn.symbol})</Text>
                  <Text>Balance: {parseFloat(balanceIn).toFixed(6)}</Text>
                </div>
                
                <div style={{ display: "flex", alignItems: "center" }}>
                  <Input
                    placeholder="0.0"
                    value={amountIn}
                    onChange={handleAmountInChange}
                    style={{ flex: 1 }}
                  />
                  <Button type="link" onClick={handleMaxIn}>
                    MAX
                  </Button>
                </div>
              </div>
            )}
          </Form.Item>
        </Card>

        {/* Switch Button */}
        <div style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}>
          <Button 
            shape="circle" 
            icon={<SwapOutlined />} 
            onClick={handleSwitchTokens}
            disabled={!tokenIn || !tokenOut}
          />
        </div>

       {/* Token Out Input */}
    <Card size="small" style={{ marginBottom: 16 }}>
      <Form.Item 
        label="To" 
        validateStatus={errorTokenOut ? "error" : ""}
        help={errorTokenOut}
        style={{ marginBottom: 0 }}
      >
        <Input
          placeholder="Enter ERC20 token address"
          value={tokenOutAddress}
          onChange={handleTokenOutAddressChange}
          disabled={loadingTokenOut}
          suffix={loadingTokenOut ? <Spin size="small" /> : null}
          style={{ marginBottom: 8 }}
        />
        
        {tokenOut && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text strong>{tokenOut.name} ({tokenOut.symbol})</Text>
              <Text>Balance: {parseFloat(balanceOut).toFixed(6)}</Text>
            </div>
            
            <div style={{ display: "flex", alignItems: "center" }}>
              <Input
                placeholder="0.0"
                value={amountOut}
                disabled
                style={{ flex: 1 }}
              />
               {/* Thêm một indicator để hiển thị khi đang tính toán */}
               {amountIn && !amountOut && pairExists && (
                  <Spin size="small" style={{ marginLeft: 8 }} />
                )}
            </div>
          </div>
        )}
      </Form.Item>
    </Card>

    {/* Price Information */}
    {pairExists && amountIn && amountOut && parseFloat(amountIn) > 0 && parseFloat(amountOut) > 0 && (
      <Card size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Text>Rate</Text>
          <Text>1 {tokenIn?.symbol} = {(parseFloat(amountOut) / parseFloat(amountIn)).toFixed(6)} {tokenOut?.symbol}</Text>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Text>Inverse Rate</Text>
          <Text>1 {tokenOut?.symbol} = {(parseFloat(amountIn) / parseFloat(amountOut)).toFixed(6)} {tokenIn?.symbol}</Text>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Text>Price Impact</Text>
          <Text type={parseFloat(priceImpact) > 5 ? "danger" : parseFloat(priceImpact) > 1 ? "warning" : "secondary"}>
            {priceImpact}%
          </Text>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Text>Slippage Tolerance</Text>
          <Text>{slippage}%</Text>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Text>Minimum Received</Text>
          <Text>{(parseFloat(amountOut) * (1 - slippage / 100)).toFixed(6)} {tokenOut?.symbol}</Text>
        </div>
      </Card>
    )}

    {/* Warning for high price impact */}
    {parseFloat(priceImpact) > 5 && (
      <Alert
        message="High Price Impact"
        description="This swap has a price impact of more than 5%. You may receive significantly less tokens than expected."
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />
    )}

    {/* Warning for no liquidity */}
    {tokenIn && tokenOut && !pairExists && (
      <Alert
        message="No Liquidity"
        description="No liquidity pool exists for this token pair. You may need to add liquidity first."
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />
    )}

    {/* Approve Button */}
    {tokenIn && amountIn && parseFloat(amountIn) > 0 && (
      <Button
        type="primary"
        block
        onClick={handleApprove}
        loading={isApproving}
        disabled={
          !tokenIn || !amountIn || parseFloat(amountIn) <= 0 ||
          parseFloat(amountIn) > parseFloat(balanceIn)
        }
      >
        Approve {tokenIn?.symbol}
      </Button>
    )}

    {/* Swap Button */}
    <Button
      type="primary"
      block
      onClick={handleSwap}
      loading={isSwapping}
      disabled={
        !pairExists || !tokenIn || !tokenOut || !amountIn || !amountOut ||
        parseFloat(amountIn) <= 0 || parseFloat(amountOut) <= 0 ||
        parseFloat(amountIn) > parseFloat(balanceIn)
      }
    >
      Swap
    </Button>
  </Form>
</Card>
  );
}