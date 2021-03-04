import { ethers } from "hardhat";
import { BigNumber, Contract } from "ethers";


export const zeroAddress = "0x0000000000000000000000000000000000000000";
export const tenPow18 = BigNumber.from(10).pow(18);

export async function getLatestBlock(): Promise<any> {
    return await ethers.provider.send("eth_getBlockByNumber", ["latest", false]);
}
//
// export async function getLatestBlockTimestamp(): Promise<number> {
//     return parseInt((await getLatestBlock()).timestamp);
// }

export async function setNextBlockTimestamp(timestamp: number): Promise<void> {
    const block = await ethers.provider.send("eth_getBlockByNumber", ["latest", false]);
    const currentTs = parseInt(block.timestamp);
    const diff = timestamp - currentTs;
    await ethers.provider.send("evm_increaseTime", [diff]);
}

export function getCurrentUnix() {
    return Math.floor(Date.now() / 1000);
}

export async function moveAtEpoch(start: number, duration: number, epoch: number) {
    await setNextBlockTimestamp(start + duration * (epoch-1));
    await ethers.provider.send("evm_mine", []);
}

export async function getCurrentEpoch(start: number, duration: number): Promise<number> {
    const currentBlockTs = parseInt((await getLatestBlock()).timestamp);

    if (currentBlockTs < start) {
        return 0;
    }

    return Math.floor((currentBlockTs - start) / duration) + 1;
}
//
// export async function contractAt(name: string, address: string): Promise<Contract> {
//     return await ethers.getContractAt(name, address);
// }
