"use client";

import { useState, useEffect, useRef } from "react";
import { Button, Input, Card, Form, message, Select, List, Image, Tabs } from "antd";
import { useWriteContract, useReadContract, useReadContracts } from "wagmi";
import { parseUnits } from "viem";
import { useAccount } from "wagmi";

const VAULT_ADDRESS = "0xe77230D57b36743Dc7064Fb847f4734d8EF0E487";
const TOKEN_ADDRESS = "0x787321352C5Af8a2c4Cbf97a3e6658fE5cffdEf7";
const NFT_ADDRESS = "0x51cF18645C179A7d86b67980463c96c3D0227291";

const ERC20_ABI = [
  { name: "balanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { name: "approve", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable", type: "function" }
];
const ERC721_ABI = [
  { name: "tokensOfOwner", inputs: [{ name: "owner", type: "address" }], outputs: [{ name: "", type: "uint256[]" }], stateMutability: "view", type: "function" },
  { name: "tokenURI", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ name: "", type: "string" }], stateMutability: "view", type: "function" },
  { name: "getNFTsByOwner", inputs: [{ name: "owner", type: "address" }], outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }, { internalType: "string[]", name: "", type: "string[]" }], stateMutability: "view", type: "function" },
  { name: "approve", inputs: [{ name: "to", type: "address" }, { name: "tokenId", type: "uint256" }], outputs: [], stateMutability: "nonpayable", type: "function" }
];
const VAULT_ABI = [
  { name: "depositToken", inputs: [{ name: "token", type: "address" }, { name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable", type: "function" },
  { name: "withdrawToken", inputs: [{ name: "token", type: "address" }, { name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable", type: "function" },
  { name: "depositNFT", inputs: [{ name: "nftContract", type: "address" }, { name: "tokenId", type: "uint256" }], outputs: [], stateMutability: "nonpayable", type: "function" },
  { name: "withdrawNFT", inputs: [{ name: "nftContract", type: "address" }, { name: "tokenId", type: "uint256" }], outputs: [], stateMutability: "nonpayable", type: "function" },
  { name: "getUserTokenBalance", inputs: [{ name: "user", type: "address" }, { name: "token", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { name: "getUserNFTs", inputs: [{ name: "user", type: "address" }, { name: "nftContract", type: "address" }], outputs: [{ name: "", type: "uint256[]" }], stateMutability: "view", type: "function" }
];

export default function MyAssetsPage() {
  const [assetType, setAssetType] = useState<"ERC20" | "ERC721">("ERC20");
  const [amount, setAmount] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [userNFTs, setUserNFTs] = useState<number[]>([]);
  const [userTokenBalance, setUserTokenBalance] = useState("0");
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { data: readContractsData } = useReadContracts();
  const isMounted = useRef(true);

  useEffect(() => () => { isMounted.current = false; }, []);

  // Get user's NFTs in vault
  const { data: userNFTsData, refetch: refetchUserNFTs } = useReadContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: "getUserNFTs",
    args: [address, NFT_ADDRESS],
    enabled: !!address
  });

  // Get user's token balance in vault
  const { data: userTokenData, refetch: refetchUserTokenBalance } = useReadContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: "getUserTokenBalance",
    args: [address, TOKEN_ADDRESS],
    enabled: !!address
  });

  // Get user's wallet token balance
  const { data: walletTokenBalance, refetch: refetchWalletBalance } = useReadContract(
    address ? { 
      address: TOKEN_ADDRESS as `0x${string}`, 
      abi: ERC20_ABI, 
      functionName: "balanceOf", 
      args: [address] 
    } : undefined
  );

  // Get user's NFTs with URIs directly
  const { data: userNFTsWithURIs, refetch: refetchNFTsWithURIs } = useReadContract({
    address: NFT_ADDRESS,
    abi: ERC721_ABI,
    functionName: "getNFTsByOwner",
    args: [address],
    enabled: !!address
  });

  useEffect(() => {
    if (userNFTsData && isMounted.current) {
      const nftIds = (userNFTsData as bigint[]).map(id => Number(id));
      setUserNFTs(nftIds);
    }
  }, [userNFTsData]);

  useEffect(() => {
    if (userTokenData && isMounted.current) {
      setUserTokenBalance(((userTokenData as bigint) / BigInt(10 ** 18)).toString());
      console.log("User token balance in vault:", userTokenData);
    }
  }, [userTokenData]);

  const refreshData = async () => {
    if (isMounted.current && address) {
      console.log("Refreshing data...");
      try {
        await refetchUserNFTs();
        await refetchUserTokenBalance();
        await refetchWalletBalance();
        await refetchNFTsWithURIs();
        console.log("Data refreshed successfully");
      } catch (error) {
        console.error("Error refreshing data:", error);
      }
    }
  };

  useEffect(() => {
    if (address) refreshData();
  }, [address]);

  const handleDeposit = async () => {
    try {
      if (assetType === "ERC20" && amount) {
        // First approve tokens to be spent by the vault
        message.loading({ content: "Approving tokens...", key: "approving" });
        await writeContractAsync({
          address: TOKEN_ADDRESS,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [VAULT_ADDRESS, parseUnits(amount, 18)]
        });
        message.success({ content: "Tokens approved", key: "approving" });
        
        // Then deposit tokens to the vault
        message.loading({ content: "Depositing tokens...", key: "depositing" });
        await writeContractAsync({
          address: VAULT_ADDRESS,
          abi: VAULT_ABI,
          functionName: "depositToken",
          args: [TOKEN_ADDRESS, parseUnits(amount, 18)]
        });
        message.success({ content: "Deposit successful", key: "depositing" });
      } else if (assetType === "ERC721" && tokenId) {
        // First approve NFT to be transferred by the vault
        message.loading({ content: "Approving NFT...", key: "approving" });
        await writeContractAsync({
          address: NFT_ADDRESS,
          abi: ERC721_ABI,
          functionName: "approve",
          args: [VAULT_ADDRESS, BigInt(tokenId)]
        });
        message.success({ content: "NFT approved", key: "approving" });
        
        // Then deposit NFT to the vault
        message.loading({ content: "Depositing NFT...", key: "depositing" });
        await writeContractAsync({
          address: VAULT_ADDRESS,
          abi: VAULT_ABI,
          functionName: "depositNFT",
          args: [NFT_ADDRESS, BigInt(tokenId)]
        });
        message.success({ content: "Deposit successful", key: "depositing" });
      }
      
      // Add a small delay before refreshing data to allow blockchain to update
      setTimeout(() => {
        refreshData();
      }, 2000);
    } catch (error) {
      console.error("Deposit error:", error);
      message.error("Deposit failed");
    }
  };

  const handleWithdraw = async () => {
    try {
      if (assetType === "ERC20" && amount) {
        message.loading({ content: "Withdrawing tokens...", key: "withdrawing" });
        await writeContractAsync({
          address: VAULT_ADDRESS,
          abi: VAULT_ABI,
          functionName: "withdrawToken",
          args: [TOKEN_ADDRESS, parseUnits(amount, 18)]
        });
        message.success({ content: "Withdraw successful", key: "withdrawing" });
      } else if (assetType === "ERC721" && tokenId) {
        message.loading({ content: "Withdrawing NFT...", key: "withdrawing" });
        await writeContractAsync({
          address: VAULT_ADDRESS,
          abi: VAULT_ABI,
          functionName: "withdrawNFT",
          args: [NFT_ADDRESS, BigInt(tokenId)]
        });
        message.success({ content: "Withdraw successful", key: "withdrawing" });
      }
      
      // Add a small delay before refreshing data to allow blockchain to update
      setTimeout(() => {
        refreshData();
      }, 2000);
    } catch (error) {
      console.error("Withdraw error:", error);
      message.error("Withdraw failed");
    }
  };

  // Get NFT image URI from userNFTsWithURIs data
  const getNFTImageURI = (tokenId: number) => {
    if (!userNFTsWithURIs) return null;
    
    const [ids, uris] = userNFTsWithURIs as [bigint[], string[]];
    const index = ids.findIndex(id => Number(id) === tokenId);
    
    return index !== -1 ? uris[index] : null;
  };

  // Render ERC20 token management UI
  const renderERC20UI = () => (
    <>
      <Form layout="vertical">
        <Form.Item label="Amount">
          <Input value={amount} onChange={e => setAmount(e.target.value)} type="number" />
        </Form.Item>
        <Button type="primary" onClick={handleDeposit} style={{ marginRight: 8 }}>Deposit</Button>
        <Button danger onClick={handleWithdraw} style={{ marginRight: 8 }}>Withdraw</Button>
        <Button type="default" onClick={refreshData}>Refresh</Button>
        <div style={{ marginTop: 16 }}>
          <Card size="small">
            <div><strong>Your Vault Balance:</strong> {userTokenBalance} tokens</div>
            <div><strong>Your Wallet Balance:</strong> {walletTokenBalance ? ((walletTokenBalance as bigint) / BigInt(10 ** 18)).toString() : "0"} tokens</div>
          </Card>
        </div>
      </Form>
    </>
  );

  // Render ERC721 NFT management UI
  const renderERC721UI = () => (
    <>
      <Form layout="vertical">
        <Form.Item label="Token ID">
          <Input value={tokenId} onChange={e => setTokenId(e.target.value)} type="number" />
        </Form.Item>
        <Button type="primary" onClick={handleDeposit} style={{ marginRight: 8 }}>Deposit</Button>
        <Button danger onClick={handleWithdraw} style={{ marginRight: 8 }}>Withdraw</Button>
        <Button type="default" onClick={refreshData}>Refresh</Button>
      </Form>

      <Card title={`Your NFTs in Vault (${userNFTs.length})`} style={{ marginTop: 16 }}>
        <List
          grid={{ gutter: 16, column: 2 }}
          dataSource={userNFTs}
          renderItem={id => (
            <List.Item>
              <Card>
                {getNFTImageURI(id) ? (
                  <Image 
                    src={getNFTImageURI(id) as string} 
                    alt={`NFT ${id}`} 
                    style={{ width: '100%', height: 150, objectFit: 'cover' }} 
                  />
                ) : (
                  <div style={{ width: '100%', height: 150, background: '#f0f0f0', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    Loading...
                  </div>
                )}
                <div style={{ textAlign: 'center', marginTop: 8 }}>Token ID: {id}</div>
              </Card>
            </List.Item>
          )}
          locale={{ emptyText: "No NFTs in your vault" }}
        />
      </Card>
    </>
  );

  return (
    <Card title="Assets Vault Manager" style={{ maxWidth: 600 }}>
      <Tabs
        activeKey={assetType}
        onChange={(key) => setAssetType(key as "ERC20" | "ERC721")}
        items={[
          {
            key: "ERC20",
            label: "ERC20 Token",
            children: renderERC20UI()
          },
          {
            key: "ERC721",
            label: "NFT",
            children: renderERC721UI()
          }
        ]}
      />
    </Card>
  );
}