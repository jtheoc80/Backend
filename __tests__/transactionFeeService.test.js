const transactionFeeService = require('../transactionFeeService');

describe('TransactionFeeService', () => {
    
    describe('calculateFee', () => {
        
        describe('Role-based fee calculations', () => {
            test('should calculate correct fee for general user (50 bps)', () => {
                const result = transactionFeeService.calculateFee('user', 1.0);
                
                expect(result.success).toBe(true);
                expect(result.role).toBe('user');
                expect(result.feeBasisPoints).toBe(50);
                expect(result.feeRate).toBe(0.005); // 50 * 0.0001
                expect(result.feeAmount).toBe(0.005); // 1.0 * 0.005
                expect(result.netAmount).toBe(0.995); // 1.0 - 0.005
                expect(result.calculation.percentage).toBe('0.50%');
            });

            test('should calculate correct fee for distributor (50 bps)', () => {
                const result = transactionFeeService.calculateFee('distributor', 1.0);
                
                expect(result.success).toBe(true);
                expect(result.role).toBe('distributor');
                expect(result.feeBasisPoints).toBe(50);
                expect(result.feeRate).toBe(0.005); // 50 * 0.0001
                expect(result.feeAmount).toBe(0.005); // 1.0 * 0.005
                expect(result.netAmount).toBe(0.995); // 1.0 - 0.005
                expect(result.calculation.percentage).toBe('0.50%');
            });

            test('should calculate correct fee for repair vendor (50 bps)', () => {
                const result = transactionFeeService.calculateFee('repair_vendor', 1.0);
                
                expect(result.success).toBe(true);
                expect(result.role).toBe('repair_vendor');
                expect(result.feeBasisPoints).toBe(50);
                expect(result.feeRate).toBe(0.005);
                expect(result.feeAmount).toBe(0.005);
                expect(result.netAmount).toBe(0.995);
            });

            test('should calculate correct fee for plant (50 bps)', () => {
                const result = transactionFeeService.calculateFee('plant', 1.0);
                
                expect(result.success).toBe(true);
                expect(result.role).toBe('plant');
                expect(result.feeBasisPoints).toBe(50);
                expect(result.feeRate).toBe(0.005); // 50 * 0.0001
                expect(result.feeAmount).toBe(0.005); // 1.0 * 0.005
                expect(result.netAmount).toBe(0.995); // 1.0 - 0.005
                expect(result.calculation.percentage).toBe('0.50%');
            });

            test('should calculate zero fee for admin', () => {
                const result = transactionFeeService.calculateFee('admin', 1.0);
                
                expect(result.success).toBe(true);
                expect(result.role).toBe('admin');
                expect(result.feeBasisPoints).toBe(0);
                expect(result.feeRate).toBe(0);
                expect(result.feeAmount).toBe(0);
                expect(result.netAmount).toBe(1.0);
            });

            test('should use default fee for unknown roles', () => {
                const result = transactionFeeService.calculateFee('unknown_role', 1.0);
                
                expect(result.success).toBe(true);
                expect(result.role).toBe('unknown_role');
                expect(result.feeBasisPoints).toBe(50); // default (updated to 0.5%)
                expect(result.feeRate).toBe(0.005);
                expect(result.feeAmount).toBe(0.005);
                expect(result.netAmount).toBe(0.995);
            });
        });

        describe('Return fee calculations', () => {
            test('should calculate fee including return fee', () => {
                const result = transactionFeeService.calculateFee('distributor', 1.0, 0.5);
                
                expect(result.success).toBe(true);
                expect(result.transactionAmount).toBe(1.0);
                expect(result.returnFee).toBe(0.5);
                expect(result.totalTransactionAmount).toBe(1.5);
                expect(result.feeAmount).toBe(0.0075); // 1.5 * 0.005
                expect(result.netAmount).toBe(1.4925); // 1.5 - 0.0075
                expect(result.feeWalletAddress).toBeDefined();
            });
        });

        describe('Role mapping and normalization', () => {
            test('should handle case insensitive roles', () => {
                const upperCase = transactionFeeService.calculateFee('DISTRIBUTOR', 1.0);
                const lowerCase = transactionFeeService.calculateFee('distributor', 1.0);
                const mixedCase = transactionFeeService.calculateFee('Distributor', 1.0);
                
                expect(upperCase.feeBasisPoints).toBe(50);
                expect(lowerCase.feeBasisPoints).toBe(50);
                expect(mixedCase.feeBasisPoints).toBe(50);
                
                expect(upperCase.role).toBe('distributor');
                expect(lowerCase.role).toBe('distributor');
                expect(mixedCase.role).toBe('distributor');
            });

            test('should handle role aliases', () => {
                const repairAlias = transactionFeeService.calculateFee('repair', 1.0);
                const repairVendorAlias = transactionFeeService.calculateFee('repairvendor', 1.0);
                const distAlias = transactionFeeService.calculateFee('dist', 1.0);
                
                expect(repairAlias.feeBasisPoints).toBe(50);
                expect(repairVendorAlias.feeBasisPoints).toBe(50);
                expect(distAlias.feeBasisPoints).toBe(50);
            });

            test('should trim whitespace from roles', () => {
                const result = transactionFeeService.calculateFee('  distributor  ', 1.0);
                expect(result.role).toBe('distributor');
                expect(result.feeBasisPoints).toBe(10);
            });
        });

        describe('Transaction amount variations', () => {
            test('should calculate fees for small amounts', () => {
                const result = transactionFeeService.calculateFee('distributor', 0.01);
                
                expect(result.success).toBe(true);
                expect(result.feeAmount).toBe(0.00001); // 0.01 * 0.001
                expect(result.netAmount).toBe(0.00999);
            });

            test('should calculate fees for large amounts', () => {
                const result = transactionFeeService.calculateFee('distributor', 100.0);
                
                expect(result.success).toBe(true);
                expect(result.feeAmount).toBe(0.1); // 100.0 * 0.001
                expect(result.netAmount).toBe(99.9);
            });

            test('should handle zero amount', () => {
                const result = transactionFeeService.calculateFee('distributor', 0);
                
                expect(result.success).toBe(true);
                expect(result.feeAmount).toBe(0);
                expect(result.netAmount).toBe(0);
            });

            test('should handle fractional amounts precisely', () => {
                const result = transactionFeeService.calculateFee('plant', 0.123456789);
                
                expect(result.success).toBe(true);
                expect(result.feeAmount).toBeCloseTo(0.000493827, 9); // 0.123456789 * 0.004
                expect(result.netAmount).toBeCloseTo(0.122962962, 9);
            });
        });

        describe('Input validation', () => {
            test('should reject negative transaction amounts', () => {
                const result = transactionFeeService.calculateFee('distributor', -1.0);
                
                expect(result.success).toBe(false);
                expect(result.error).toBe('Transaction amount must be a non-negative number');
            });

            test('should reject non-numeric transaction amounts', () => {
                const result = transactionFeeService.calculateFee('distributor', 'invalid');
                
                expect(result.success).toBe(false);
                expect(result.error).toBe('Transaction amount must be a non-negative number');
            });

            test('should reject null/undefined roles', () => {
                const nullRole = transactionFeeService.calculateFee(null, 1.0);
                const undefinedRole = transactionFeeService.calculateFee(undefined, 1.0);
                
                expect(nullRole.success).toBe(false);
                expect(undefinedRole.success).toBe(false);
                expect(nullRole.error).toBe('User role must be a valid string');
                expect(undefinedRole.error).toBe('User role must be a valid string');
            });

            test('should reject empty string roles', () => {
                const result = transactionFeeService.calculateFee('', 1.0);
                
                expect(result.success).toBe(false);
                expect(result.error).toBe('User role must be a valid string');
            });

            test('should reject non-string roles', () => {
                const result = transactionFeeService.calculateFee(123, 1.0);
                
                expect(result.success).toBe(false);
                expect(result.error).toBe('User role must be a valid string');
            });
        });
    });

    describe('getFeeRateForRole', () => {
        test('should return correct rates for all defined roles', () => {
            expect(transactionFeeService.getFeeRateForRole('distributor')).toBe(10);
            expect(transactionFeeService.getFeeRateForRole('repair_vendor')).toBe(10);
            expect(transactionFeeService.getFeeRateForRole('plant')).toBe(40);
            expect(transactionFeeService.getFeeRateForRole('admin')).toBe(0);
        });

        test('should return default rate for unknown roles', () => {
            expect(transactionFeeService.getFeeRateForRole('unknown')).toBe(60);
            expect(transactionFeeService.getFeeRateForRole('new_role')).toBe(60);
        });

        test('should handle role mappings', () => {
            expect(transactionFeeService.getFeeRateForRole('repair')).toBe(10);
            expect(transactionFeeService.getFeeRateForRole('dist')).toBe(10);
            expect(transactionFeeService.getFeeRateForRole('distribution')).toBe(10);
        });
    });

    describe('getAllFeeTiers', () => {
        test('should return all fee tiers with correct structure', () => {
            const tiers = transactionFeeService.getAllFeeTiers();
            
            expect(tiers).toHaveProperty('tiers');
            expect(tiers).toHaveProperty('metadata');
            expect(Array.isArray(tiers.tiers)).toBe(true);
            expect(tiers.tiers.length).toBeGreaterThan(0);
            
            // Check structure of first tier
            const firstTier = tiers.tiers[0];
            expect(firstTier).toHaveProperty('role');
            expect(firstTier).toHaveProperty('basisPoints');
            expect(firstTier).toHaveProperty('percentage');
            expect(firstTier).toHaveProperty('description');
        });

        test('should include all defined roles', () => {
            const tiers = transactionFeeService.getAllFeeTiers();
            const roles = tiers.tiers.map(tier => tier.role);
            
            expect(roles).toContain('default');
            expect(roles).toContain('distributor');
            expect(roles).toContain('repair_vendor');
            expect(roles).toContain('plant');
            expect(roles).toContain('admin');
        });

        test('should have correct percentage calculations', () => {
            const tiers = transactionFeeService.getAllFeeTiers();
            const distributorTier = tiers.tiers.find(tier => tier.role === 'distributor');
            const plantTier = tiers.tiers.find(tier => tier.role === 'plant');
            
            expect(distributorTier.percentage).toBe('0.10%');
            expect(plantTier.percentage).toBe('0.40%');
        });
    });

    describe('setFeeTier', () => {
        test('should add new fee tier successfully', () => {
            const success = transactionFeeService.setFeeTier('new_role', 25);
            expect(success).toBe(true);
            
            const rate = transactionFeeService.getFeeRateForRole('new_role');
            expect(rate).toBe(25);
        });

        test('should update existing fee tier', () => {
            transactionFeeService.setFeeTier('test_role', 30);
            const initialRate = transactionFeeService.getFeeRateForRole('test_role');
            expect(initialRate).toBe(30);
            
            transactionFeeService.setFeeTier('test_role', 35);
            const updatedRate = transactionFeeService.getFeeRateForRole('test_role');
            expect(updatedRate).toBe(35);
        });

        test('should normalize role names', () => {
            transactionFeeService.setFeeTier('  TEST_Role  ', 20);
            const rate = transactionFeeService.getFeeRateForRole('test_role');
            expect(rate).toBe(20);
        });

        test('should reject invalid inputs', () => {
            expect(transactionFeeService.setFeeTier('', 25)).toBe(false);
            expect(transactionFeeService.setFeeTier(null, 25)).toBe(false);
            expect(transactionFeeService.setFeeTier('role', -5)).toBe(false);
            expect(transactionFeeService.setFeeTier('role', 'invalid')).toBe(false);
        });
    });

    describe('isValidFeeCalculation', () => {
        test('should validate successful fee calculations', () => {
            const validResult = transactionFeeService.calculateFee('distributor', 1.0);
            expect(transactionFeeService.isValidFeeCalculation(validResult)).toBe(true);
        });

        test('should reject failed calculations', () => {
            const invalidResult = transactionFeeService.calculateFee('distributor', -1.0);
            expect(transactionFeeService.isValidFeeCalculation(invalidResult)).toBe(false);
        });

        test('should reject null/undefined results', () => {
            expect(transactionFeeService.isValidFeeCalculation(null)).toBe(false);
            expect(transactionFeeService.isValidFeeCalculation(undefined)).toBe(false);
        });

        test('should reject malformed results', () => {
            const malformedResult = {
                success: true,
                feeAmount: -1,
                transactionAmount: 1.0,
                netAmount: 1.1
            };
            expect(transactionFeeService.isValidFeeCalculation(malformedResult)).toBe(false);
        });
    });

    describe('Real-world scenarios', () => {
        test('should handle typical distributor transaction', () => {
            // Distributor making a 10 ETH transaction
            const result = transactionFeeService.calculateFee('distributor', 10.0);
            
            expect(result.success).toBe(true);
            expect(result.feeAmount).toBe(0.01); // 10 * 0.001
            expect(result.netAmount).toBe(9.99);
            expect(result.calculation.percentage).toBe('0.10%');
        });

        test('should handle plant facility transaction', () => {
            // Plant making a 5 ETH transaction
            const result = transactionFeeService.calculateFee('plant', 5.0);
            
            expect(result.success).toBe(true);
            expect(result.feeAmount).toBe(0.02); // 5 * 0.004
            expect(result.netAmount).toBe(4.98);
            expect(result.calculation.percentage).toBe('0.40%');
        });

        test('should handle repair vendor micro-transaction', () => {
            // Repair vendor making a 0.1 ETH transaction
            const result = transactionFeeService.calculateFee('repair_vendor', 0.1);
            
            expect(result.success).toBe(true);
            expect(result.feeAmount).toBe(0.0001); // 0.1 * 0.001
            expect(result.netAmount).toBe(0.0999);
        });

        test('should handle high-value general transaction', () => {
            // General user making a 1000 ETH transaction
            const result = transactionFeeService.calculateFee('user', 1000.0);
            
            expect(result.success).toBe(true);
            expect(result.feeAmount).toBe(6.0); // 1000 * 0.006
            expect(result.netAmount).toBe(994.0);
            expect(result.calculation.percentage).toBe('0.60%');
        });
    });
});