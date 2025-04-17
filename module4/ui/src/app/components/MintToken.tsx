"use client";

import { useState, useEffect } from "react";
import { Button, Input, Card, Form, message, Modal, Typography } from "antd";
import { useWriteContract, usePublicClient, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from "viem";

const { Title, Text, Paragraph } = Typography;

// Địa chỉ hợp đồng ERC20Factory và ABI
const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_ERC20_FACTORY_ADDRESS;
console.log("add", FACTORY_ADDRESS);
const FACTORY_ABI = [
  {
    "inputs": [
      { "internalType": "string", "name": "name", "type": "string" },
      { "internalType": "string", "name": "symbol", "type": "string" },
      { "internalType": "uint256", "name": "totalSupply", "type": "uint256" }
    ],
    "name": "createToken",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function",
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": false, "internalType": "address", "name": "tokenAddress", "type": "address" },
      { "indexed": false, "internalType": "string", "name": "name", "type": "string" },
      { "indexed": false, "internalType": "string", "name": "symbol", "type": "string" },
      { "indexed": false, "internalType": "uint256", "name": "totalSupply", "type": "uint256" }
    ],
    "name": "TokenCreated",
    "type": "event"
  }
];

export default function CreateToken() {
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [tokenSupply, setTokenSupply] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [createdToken, setCreatedToken] = useState(null);
  const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);

  // Using wagmi hooks
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  
  // Hook to wait for transaction receipt
  const { data: receipt, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
    enabled: Boolean(txHash),
  });

  // Effect to handle transaction confirmation
  useEffect(() => {
    const handleConfirmation = async () => {
      if (isConfirmed && receipt) {
        console.log("Transaction confirmed, receipt:", receipt);
        
        try {
          console.log("Processing create token receipt");
          
          // Tìm sự kiện TokenCreated trong logs
          for (const log of receipt.logs) {
            try {
              // Kiểm tra xem log có phải từ factory contract không
              if (log.address.toLowerCase() === FACTORY_ADDRESS.toLowerCase()) {
                // Giải mã log để tìm sự kiện TokenCreated
                const decodedLog = publicClient.decodeEventLog({
                  abi: FACTORY_ABI,
                  data: log.data,
                  topics: log.topics,
                });
                
                // Nếu đây là sự kiện TokenCreated
                if (decodedLog && decodedLog.eventName === "TokenCreated") {
                  console.log("Found TokenCreated event:", decodedLog);
                  
                  // Lấy thông tin token từ sự kiện
                  const tokenInfo = {
                    address: decodedLog.args.tokenAddress,
                    name: decodedLog.args.name,
                    symbol: decodedLog.args.symbol,
                    totalSupply: formatUnits(decodedLog.args.totalSupply, 18)
                  };
                  
                  console.log("Token info:", tokenInfo);
                  
                  // Cập nhật state với thông tin token
                  setCreatedToken(tokenInfo);
                  setIsSuccessModalVisible(true);
                  message.success(`Token created successfully!`);
                  break;
                }
              }
            } catch (e) {
              console.log("Failed to decode log:", e);
            }
          }
          
          // Nếu không tìm thấy sự kiện TokenCreated
          if (!createdToken) {
            message.warning("Token may have been created but couldn't retrieve details automatically.");
          }
        } catch (error) {
          console.error("Error processing receipt:", error);
          message.error("Error processing transaction receipt");
        } finally {
          setIsCreating(false);
          setTxHash(null);
          // Reset form sau khi tạo token thành công
          setTokenName("");
          setTokenSymbol("");
          setTokenSupply("");
        }
      }
    };
    
    if (isConfirmed && receipt) {
      handleConfirmation();
    }
  }, [isConfirmed, receipt, publicClient, FACTORY_ADDRESS]);

  const handleCreateToken = async () => {
    if (!tokenName || !tokenSymbol || !tokenSupply) {
      message.error("Please fill in all fields!");
      return;
    }

    try {
      setIsCreating(true);
      message.loading({ content: "Creating token...", key: "creating", duration: 0 });
      
      // Send the transaction
      const hash = await writeContractAsync({
        address: FACTORY_ADDRESS,
        abi: FACTORY_ABI,
        functionName: "createToken",
        args: [tokenName, tokenSymbol, parseUnits(tokenSupply, 18)],
      });

      console.log("Transaction sent, hash:", hash);
      message.loading({ content: "Waiting for confirmation...", key: "creating", duration: 0 });
      
      // Set the transaction hash to trigger the useWaitForTransactionReceipt hook
      setTxHash(hash);
      
    } catch (error) {
      console.error("Error:", error);
      message.destroy("creating");
      message.error(`Error: ${error.message || "Transaction failed"}`);
      setIsCreating(false);
    }
  };

  return (
    <Card title="Create ERC20 Token" style={{ width: 500 }}>
      <Form layout="vertical">
        <Form.Item 
          label="Token Name" 
          required
          tooltip="The full name of your token, e.g., 'My Custom Token'"
        >
          <Input 
            value={tokenName} 
            onChange={(e) => setTokenName(e.target.value)}
            placeholder="Enter token name"
          />
        </Form.Item>
        
        <Form.Item 
          label="Token Symbol" 
          required
          tooltip="The symbol/ticker of your token, e.g., 'MCT'"
        >
          <Input 
            value={tokenSymbol} 
            onChange={(e) => setTokenSymbol(e.target.value)}
            placeholder="Enter token symbol"
          />
        </Form.Item>
        
        <Form.Item 
          label="Total Supply" 
          required
          tooltip="The total supply of tokens to be created"
        >
          <Input
            type="number"
            value={tokenSupply}
            onChange={(e) => setTokenSupply(e.target.value)}
            placeholder="Enter total supply"
            suffix="Tokens"
          />
        </Form.Item>
        
        <Button
          type="primary"
          onClick={handleCreateToken}
          loading={isCreating}
          style={{ width: '100%' }}
        >
          Create Token
        </Button>
      </Form>

      <Modal
        title="Token Created Successfully"
        open={isSuccessModalVisible}
        onOk={() => setIsSuccessModalVisible(false)}
        onCancel={() => setIsSuccessModalVisible(false)}
        width={600}
      >
        {createdToken && (
          <div>
            <Title level={4}>Token Details</Title>
            <Paragraph>
              <Text strong>Name:</Text> {createdToken.name}
            </Paragraph>
            <Paragraph>
              <Text strong>Symbol:</Text> {createdToken.symbol}
            </Paragraph>
            <Paragraph>
              <Text strong>Total Supply:</Text> {createdToken.totalSupply} {createdToken.symbol}
            </Paragraph>
            <Paragraph>
              <Text strong>Token Address:</Text>
              <br />
              <Text copyable style={{ wordBreak: 'break-all' }}>{createdToken.address}</Text>
            </Paragraph>
            <Paragraph type="secondary">
              All tokens have been minted to your wallet address. You can now use them or transfer them to others.
            </Paragraph>
          </div>
        )}
      </Modal>
    </Card>
  );
}