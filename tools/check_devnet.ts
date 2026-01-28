
import { Connection, PublicKey } from '@solana/web3.js';

const PROGRAM_ID = new PublicKey('BQU16njpJtGeTt6gG8NbXTmPWVAcMjszRPvr3uSvL7Cf');
const CONNECTION = new Connection('https://api.devnet.solana.com', 'confirmed');

async function checkGameConfig() {
    console.log('Checking Game Config on Devnet...');
    
    const [gameConfigPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('game_config')],
        PROGRAM_ID
    );
    
    console.log(`Game Config PDA: ${gameConfigPda.toString()}`);
    
    const accountInfo = await CONNECTION.getAccountInfo(gameConfigPda);
    
    if (accountInfo) {
        console.log('✅ Game Config Account exists!');
        console.log(`   Data length: ${accountInfo.data.length} bytes`);
        console.log(`   Owner: ${accountInfo.owner.toString()}`);
    } else {
        console.log('❌ Game Config Account does NOT exist!');
        console.log('   Please run initialize_game instruction first.');
    }
}

checkGameConfig().catch(console.error);
