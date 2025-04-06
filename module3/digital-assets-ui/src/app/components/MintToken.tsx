"use client";

import { useState } from "react";
import { Button, Input, Card, Form, message, Modal } from "antd";
import { useWriteContract } from "wagmi";
import { parseUnits } from "viem";

// Địa chỉ contract và ABI của MyToken
const TOKEN_ADDRESS = "0x787321352C5Af8a2c4Cbf97a3e6658fE5cffdEf7";
const TOKEN_ABI = [
  {
    "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }],
    "name": "mint",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function",
  },
];

export default function MintToken() {
    const [mintAmount, setMintAmount] = useState("");
    const [isMinting, setIsMinting] = useState(false);
    const [isSuccessModalVisible, setIsSucessModalVisible] = useState(false);

    const { writeContractAsync } = useWriteContract();

    const handleMintToken = async () => {
        if(!mintAmount) {
            message.error("Pls enter amount !");
            return;
        }

        try {
            setIsMinting(true);
            message.loading({content: "Transaction peding....", key: "minting", duration: 0});

            const tx = await writeContractAsync({
                address: TOKEN_ADDRESS,
                abi: TOKEN_ABI,
                functionName: "mint",
                args: [parseUnits(mintAmount, 18)],
            })

            console.log("transaction send, hash", tx);
            message.destroy("minting");

            setIsSucessModalVisible(true);
            setMintAmount("");
            
        } catch (error) {
            console.log("error", error);
            message.destroy("minting");
            message.error("TRansaction failed");
        } finally {
            setIsMinting(false);
        }
    }

    return (
        <Card title="Mint ERC20 Token" style={{ width: 400}}>
            <Form>
                <Form.Item label="Amount">
                    <Input type="number" value={mintAmount} onChange={(e) => setMintAmount(e.target.value) }>
                    </Input>
                </Form.Item>
                <Button type="primary" onClick={handleMintToken} loading={isMinting}>
                    Mint Token
                </Button>
            </Form>

            <Modal 
                title="Mint success"
                open={isSuccessModalVisible}
                onOk={() => setIsSucessModalVisible(false)}
                onCancel={() => setIsSucessModalVisible(false)}
            >
                <p>You minted {mintAmount} tokens success</p>
            </Modal>
        </Card>
    );
}