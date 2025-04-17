"use client";

import { useState, useEffect } from "react";
import { Card, Table, Typography, Button, Input, Spin, Tag, Tooltip, Statistic, Row, Col } from "antd";
import { usePublicClient } from "wagmi";
import { formatUnits } from "viem";
import { SearchOutlined, SwapOutlined, PlusOutlined } from "@ant-design/icons";
import Link from "next/link";

const { Title, Text } = Typography;

// ABI của Factory contract
const FACTORY_ABI = [
  {
    "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "name": "allPairs",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "allPairs",
    "outputs": [{ "internalType": "address[]", "name": "", "type": "address[]" }],
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
  },
  {
    "inputs": [],
    "name": "getPair",
    "outputs": [
      { "internalType": "address", "name": "", "type": "address" },
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI của ERC20 token
const ERC20_ABI = [
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
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// Địa chỉ của Factory contract
const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS; // Thay bằng địa chỉ thực của Factory
console.log("addr", FACTORY_ADDRESS);
export default function AllPairs() {
  const [pairs, setPairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [totalPairs, setTotalPairs] = useState(0);
  const [totalLiquidity, setTotalLiquidity] = useState(0);
  
  const publicClient = usePublicClient();
  
  // Lấy danh sách tất cả các pair
  useEffect(() => {
    const fetchAllPairs = async () => {
      try {
        setLoading(true);
        
        // Lấy danh sách địa chỉ pair từ allPairs array
        let pairAddresses = [];
        try {
          // Thử lấy toàn bộ mảng allPairs (nếu contract có hàm getter cho mảng)
          pairAddresses = await publicClient.readContract({
            address: FACTORY_ADDRESS,
            abi: FACTORY_ABI,
            functionName: "allPairs",
          });
        } catch (error) {
          console.log("Could not get allPairs array directly, trying index by index");
          
          // Nếu không có hàm getter cho mảng, lấy từng phần tử một
          let index = 0;
          let keepGoing = true;
          
          while (keepGoing) {
            try {
              const pairAddress = await publicClient.readContract({
                address: FACTORY_ADDRESS,
                abi: FACTORY_ABI,
                functionName: "allPairs",
                args: [index],
              });
              
              if (pairAddress && pairAddress !== "0x0000000000000000000000000000000000000000") {
                pairAddresses.push(pairAddress);
                index++;
              } else {
                keepGoing = false;
              }
            } catch (error) {
              console.log("Error or end of array reached at index:", index);
              keepGoing = false;
            }
          }
        }
        
        setTotalPairs(pairAddresses.length);
        
        // Lấy thông tin chi tiết của từng pair
        const pairDetailsPromises = pairAddresses.map(fetchPairDetails);
        const pairDetails = await Promise.all(pairDetailsPromises);
        
        // Lọc ra các pair có lỗi
        const validPairs = pairDetails.filter(pair => !pair.error);
        
        // Tính tổng liquidity (đơn giản hóa, trong thực tế cần tính toán giá trị USD)
        const totalLiq = validPairs.reduce((sum, pair) => sum + (pair.liquidityUSD || 0), 0);
        setTotalLiquidity(totalLiq);
        
        setPairs(validPairs);
      } catch (error) {
        console.error("Error fetching pairs:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (publicClient) {
      fetchAllPairs();
    }
  }, [publicClient]);
  
  // Lấy thông tin chi tiết của một pair
  const fetchPairDetails = async (pairAddress) => {
    try {
      // Lấy địa chỉ token0 và token1 từ hàm getPair hoặc từ các biến state token0 và token1
      let token0Address, token1Address;
      
      try {
        // Thử lấy từ hàm getPair
        const pairTokens = await publicClient.readContract({
          address: pairAddress,
          abi: PAIR_ABI,
          functionName: "getPair",
        });
        
        token0Address = pairTokens[0];
        token1Address = pairTokens[1];
      } catch (error) {
        console.log("Could not get tokens from getPair, trying token0 and token1");
        
        // Nếu không có hàm getPair, lấy từ biến state token0 và token1
        [token0Address, token1Address] = await Promise.all([
          publicClient.readContract({
            address: pairAddress,
            abi: PAIR_ABI,
            functionName: "token0",
          }),
          publicClient.readContract({
            address: pairAddress,
            abi: PAIR_ABI,
            functionName: "token1",
          }),
        ]);
      }
      
      // Lấy thông tin của token0 và token1
      const [
        token0Symbol, token0Name, token0Decimals,
        token1Symbol, token1Name, token1Decimals
      ] = await Promise.all([
        publicClient.readContract({
          address: token0Address,
          abi: ERC20_ABI,
          functionName: "symbol",
        }),
        publicClient.readContract({
          address: token0Address,
          abi: ERC20_ABI,
          functionName: "name",
        }),
        publicClient.readContract({
          address: token0Address,
          abi: ERC20_ABI,
          functionName: "decimals",
        }),
        publicClient.readContract({
          address: token1Address,
          abi: ERC20_ABI,
          functionName: "symbol",
        }),
        publicClient.readContract({
          address: token1Address,
          abi: ERC20_ABI,
          functionName: "name",
        }),
        publicClient.readContract({
          address: token1Address,
          abi: ERC20_ABI,
          functionName: "decimals",
        }),
      ]);
      
      // Lấy reserves và totalSupply
      const [reserves, totalSupply] = await Promise.all([
        publicClient.readContract({
          address: pairAddress,
          abi: PAIR_ABI,
          functionName: "getReserves",
        }),
        publicClient.readContract({
          address: pairAddress,
          abi: PAIR_ABI,
          functionName: "totalSupply",
        }),
      ]);
      
      const reserve0 = formatUnits(reserves[0], token0Decimals);
      const reserve1 = formatUnits(reserves[1], token1Decimals);
      
      // Tính toán giá trị liquidity (đơn giản hóa)
      // Trong thực tế, bạn cần dữ liệu giá từ oracle hoặc API
      const token0Price = 1; // Giả định giá token0 là 1 USD
      const token1Price = parseFloat(reserve0) > 0 ? parseFloat(reserve1) / parseFloat(reserve0) : 0; // Tính giá token1 dựa trên tỷ lệ reserves
      
      const liquidityUSD = parseFloat(reserve0) * token0Price + parseFloat(reserve1) * token1Price;
      
      return {
        address: pairAddress,
        token0: {
          address: token0Address,
          symbol: token0Symbol,
          name: token0Name,
          decimals: token0Decimals,
        },
        token1: {
          address: token1Address,
          symbol: token1Symbol,
          name: token1Name,
          decimals: token1Decimals,
        },
        reserve0,
        reserve1,
        totalSupply: formatUnits(totalSupply, 18), // LP token thường có 18 decimals
        liquidityUSD,
        token0Price,
        token1Price,
      };
    } catch (error) {
      console.error(`Error fetching details for pair ${pairAddress}:`, error);
      return {
        address: pairAddress,
        error: true,
      };
    }
  };
  
  // Lọc pairs theo từ khóa tìm kiếm
  const filteredPairs = pairs.filter(pair => {
    if (!pair.token0 || !pair.token1) return false;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      pair.token0.symbol.toLowerCase().includes(searchLower) ||
      pair.token1.symbol.toLowerCase().includes(searchLower) ||
      pair.token0.name.toLowerCase().includes(searchLower) ||
      pair.token1.name.toLowerCase().includes(searchLower) ||
      pair.address.toLowerCase().includes(searchLower)
    );
  });
  
  // Cấu hình cột cho bảng
  const columns = [
    {
      title: 'Pair',
      dataIndex: 'pair',
      key: 'pair',
      render: (_, record) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Tag color="blue">{record.token0.symbol}</Tag>
            <SwapOutlined style={{ margin: '0 8px' }} />
            <Tag color="green">{record.token1.symbol}</Tag>
          </div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.token0.name} / {record.token1.name}
          </Text>
          <div>
            <Text copyable={{ text: record.address }} type="secondary" style={{ fontSize: '12px' }}>
              {`${record.address.substring(0, 6)}...${record.address.substring(record.address.length - 4)}`}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Liquidity',
      dataIndex: 'liquidityUSD',
      key: 'liquidityUSD',
      sorter: (a, b) => a.liquidityUSD - b.liquidityUSD,
      render: (liquidityUSD) => `$${liquidityUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    },
    {
      title: 'Reserves',
      key: 'reserves',
      render: (_, record) => (
        <Tooltip title={`${record.reserve0} ${record.token0.symbol} / ${record.reserve1} ${record.token1.symbol}`}>
          <div>
            {parseFloat(record.reserve0).toLocaleString(undefined, { maximumFractionDigits: 4 })} {record.token0.symbol}
            <br />
            {parseFloat(record.reserve1).toLocaleString(undefined, { maximumFractionDigits: 4 })} {record.token1.symbol}
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'Price',
      key: 'price',
      render: (_, record) => (
        <div>
          <div>1 {record.token0.symbol} = {(record.token1Price).toLocaleString(undefined, { maximumFractionDigits: 6 })} {record.token1.symbol}</div>
          <div>1 {record.token1.symbol} = {(1 / record.token1Price).toLocaleString(undefined, { maximumFractionDigits: 6 })} {record.token0.symbol}</div>
        </div>
      ),
    },
    {
      title: 'LP Supply',
      dataIndex: 'totalSupply',
      key: 'totalSupply',
      render: (totalSupply) => parseFloat(totalSupply).toLocaleString(undefined, { maximumFractionDigits: 4 }),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <div>
          <Link href={`/swap?inputToken=${record.token0.address}&outputToken=${record.token1.address}`}>
            <Button type="primary" icon={<SwapOutlined />} size="small" style={{ marginRight: 8 }}>
              Swap
            </Button>
          </Link>
          <Link href={`/add-liquidity?tokenA=${record.token0.address}&tokenB=${record.token1.address}`}>
            <Button icon={<PlusOutlined />} size="small">
              Add Liquidity
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px' }}>
      <Title level={2}>All Liquidity Pairs</Title>
      
      {/* Stats Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card>
            <Statistic
              title="Total Pairs"
              value={totalPairs}
              prefix={<Tag color="blue">Pairs</Tag>}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card>
            <Statistic
              title="Total Liquidity"
              value={totalLiquidity}
              precision={2}
              prefix="$"
            />
          </Card>
        </Col>
      </Row>
      
      {/* Search Bar */}
      <Input
        placeholder="Search by token name, symbol, or pair address"
        prefix={<SearchOutlined />}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ marginBottom: 16 }}
        allowClear
      />
      
      {/* Pairs Table */}
      <Card>
        <Table
          dataSource={filteredPairs}
          columns={columns}
          rowKey="address"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
          }}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: loading ? 'Loading...' : 'No pairs found' }}
        />
      </Card>
    </div>
  );
}