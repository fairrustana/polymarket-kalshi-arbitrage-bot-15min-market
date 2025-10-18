const TOKEN_MANAGER_ABI = [
];

const ERC20_ABI = [
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function balanceOf(address owner) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
    'function name() view returns (string)'
];

const HELPER3_ABI = [
    'function liquidityAdded(address token) view returns (bool)'
] as const;

const PANCAKE_ROUTER_ABI = [
]

export {
    TOKEN_MANAGER_ABI,
    ERC20_ABI,
    HELPER3_ABI,
    PANCAKE_ROUTER_ABI
};