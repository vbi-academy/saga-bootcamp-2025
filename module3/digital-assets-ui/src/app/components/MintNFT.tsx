"use client";

import { useState, useEffect } from "react";
import { Button, Input, Card, Form, Upload, message, Modal, List } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useWriteContract, useReadContract, useAccount } from "wagmi";

// Thông tin contract NFT
const NFT_ADDRESS = "0x51cF18645C179A7d86b67980463c96c3D0227291";
const NFT_ABI = [
  {
    "inputs": [{ "internalType": "string", "name": "tokenURI", "type": "string" }],
    "name": "mintNFT",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }],
    "name": "getNFTsByOwner",
    "outputs": [
      { "internalType": "uint256[]", "name": "", "type": "uint256[]" },
      { "internalType": "string[]", "name": "", "type": "string[]" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// API Key Pinata
const PINATA_API_KEY = "3fafe823b2c056f2254f";
const PINATA_SECRET_KEY = "aed6ef2a34cb96578ba716e89651b72809b88b9f8db133859345c631c874254b"; 

export default function MintNFT() {

    const [nftName, setNFTName] = useState("");
    const [nftImage, setNFTImage] = useState<File | null>(null);
    const [isMinting, setIsMinting] = useState(false);
    const [mintedTokenId, setMintedTokenId] = useState<number | null>(null);
    const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);

    const [nftList, setNFTList] = useState<{id: number; uri: string}[]>([]);

    const { address } = useAccount();

    const {data: userNFTs, refetch } = useReadContract({
        address: NFT_ADDRESS,
        abi: NFT_ABI,
        functionName: "getNFTsByOwner",
        args: [address]
    });


    const { writeContractAsync } = useWriteContract();

    const uploadToPinata = async (file: File) => {
        const formData = new FormData();

        formData.append("file", file);

        try {
            const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
                method: "POST",
                headers: {
                    "pinata_api_key": PINATA_API_KEY,
                    "pinata_secret_api_key": PINATA_SECRET_KEY,
                },
                body: formData
            });

            const data = await res.json();
            return `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;

        } catch (error) {
            console.log("Upload failed");
            return null;
        }
    };

    useEffect(() => {
        if (userNFTs) {
            const [ids, uris] = userNFTs as [bigint[], string[]];
            setNFTList(ids.map((id, index) => ({id: Number(id), uri: uris[index]})));
        }
    }
, [userNFTs]);

    const handleMintNFT = async () => {
        if (!nftName || !nftImage) {
            message.error("Enter Name & upload Image to continue...");
            return;
        }

        if (!address) {
            message.error("Connect Wallet to Continue...");
            return ;
        }

        try {
            setIsMinting(true);
            message.loading({content: "Uploading to ipfs...", key: "uploading", duration: 0});

            const imageUrl = await uploadToPinata(nftImage);
            if (!imageUrl) throw new Error ("IPFS upload failed");

            message.destroy("uploading");
            message.loading({ content: "Minting NFt...", key: "minting", duration: 0});

            const tx = await writeContractAsync({
                address: NFT_ADDRESS,
                abi: NFT_ABI,
                functionName: "mintNFT",
                args: [imageUrl]
            });

            console.log("Transaction sent, hash:", tx);

            const tokenId = typeof tx === 'string' ? parseInt(tx, 10): tx;

            setMintedTokenId(tokenId);

            message.destroy("minting");
            setIsSuccessModalVisible(true);

            setNFTName("");
            setNFTImage(null);
            refetch();
        } catch(error) {
            console.log("Minting Failed", error);

            message.destroy("minting");
            message.error("Tx failed");
        } finally {
            setIsMinting(false);
        }
    }

    return (
    <Card title= "Mint ERC721 Token" style={{width: 600}}>
        <Form>
            <Form.Item label="NFT Name">
                <Input value={nftName} onChange={(e) => setNFTName(e.target.value)}></Input>
            </Form.Item>
            <Form.Item label="Update Image">
                <Upload beforeUpload={(file) => { setNFTImage(file); return false; }}>
                    <Button icon={<UploadOutlined/>}>Upload</Button>
                </Upload>
            </Form.Item>
            <Button type="primary" onClick={handleMintNFT} loading={isMinting}>
                Mint NFT
            </Button>
        </Form>
        <Modal
        title= "Mint Success"
        open={isSuccessModalVisible}
        onOk={() => setIsSuccessModalVisible(false)}
        onCancel={() => setIsSuccessModalVisible(false)}
        >
            <p>Mint NFT thanh cong</p>
        </Modal>

        <Card title="Your NFTs" style={{marginTop: 20}}>
            {nftList.length === 0 ? (
                <p>No NFTs found.</p>
            ) : (
                <List 
                grid={{gutter: 16, column: 3}
                }
                dataSource={nftList}
                renderItem={(item) => (
                    <List.Item>
                        <Card cover={<img src={item.uri} alt={`${item.id}`} ></img>} style={{textAlign: "center"}}>
                            <p>Token Id: {item.id}</p>
                        </Card>
                    </List.Item>
                )}
                >

                </List>
            )}
        </Card>
    </Card>
);
}