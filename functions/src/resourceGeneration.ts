import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Kingdom, BuildingType, BUILDING_PRODUCTION } from '../../src/types/kingdom';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Run every hour to update resources
export const generateResources = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
    console.log('Starting resource generation...');

    try {
      // Get all kingdoms
      const kingdomsSnapshot = await db.collection('kingdoms').get();
      
      const batch = db.batch();
      let updateCount = 0;

      for (const doc of kingdomsSnapshot.docs) {
        const kingdom = doc.data() as Kingdom;
        
        // Calculate resource generation based on buildings
        const resourceGeneration = {
          gold: 0,
          wood: 0,
          stone: 0,
          food: 0
        };

        // Calculate base production from buildings
        for (const building of kingdom.buildings) {
          const production = BUILDING_PRODUCTION[building.type as BuildingType];
          if (production && production.amount > 0) {
            const baseAmount = production.amount * building.level;
            resourceGeneration[production.resource] += baseAmount;
          }
        }

        // Apply empire boosts if any
        if (kingdom.empireId) {
          const empireDoc = await db.collection('empires').doc(kingdom.empireId).get();
          if (empireDoc.exists) {
            const empire = empireDoc.data();
            if (empire?.boosts) {
              resourceGeneration.gold *= empire.boosts.gold || 1;
              resourceGeneration.wood *= empire.boosts.wood || 1;
              resourceGeneration.stone *= empire.boosts.stone || 1;
              resourceGeneration.food *= empire.boosts.food || 1;
            }
          }
        }

        // Update kingdom resources
        const newResources = {
          gold: Math.min(kingdom.resources.gold + resourceGeneration.gold, 999999),
          wood: Math.min(kingdom.resources.wood + resourceGeneration.wood, 999999),
          stone: Math.min(kingdom.resources.stone + resourceGeneration.stone, 999999),
          food: Math.min(kingdom.resources.food + resourceGeneration.food, 999999)
        };

        batch.update(doc.ref, {
          resources: newResources,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });

        updateCount++;
      }

      // Commit all updates
      await batch.commit();
      console.log(`Updated resources for ${updateCount} kingdoms`);

    } catch (error) {
      console.error('Error generating resources:', error);
    }
  });

// Function to handle building completion
export const completeBuildings = functions.pubsub
  .schedule('every 1 minutes')
  .onRun(async (context) => {
    console.log('Checking for completed buildings...');

    try {
      const now = Date.now();
      const kingdomsSnapshot = await db.collection('kingdoms').get();
      
      const batch = db.batch();
      let updateCount = 0;

      for (const doc of kingdomsSnapshot.docs) {
        const kingdom = doc.data() as Kingdom;
        let hasUpdates = false;
        
        const updatedBuildings = kingdom.buildings.map(building => {
          if (building.isConstructing && building.constructionEndTime && building.constructionEndTime <= now) {
            hasUpdates = true;
            return {
              ...building,
              isConstructing: false,
              constructionEndTime: undefined
            };
          }
          return building;
        });

        if (hasUpdates) {
          batch.update(doc.ref, {
            buildings: updatedBuildings,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
          });
          updateCount++;
        }
      }

      if (updateCount > 0) {
        await batch.commit();
        console.log(`Completed buildings for ${updateCount} kingdoms`);
      }

    } catch (error) {
      console.error('Error completing buildings:', error);
    }
  });

// Function to distribute staking rewards
export const distributeStakingRewards = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    console.log('Distributing staking rewards...');

    try {
      const stakingSnapshot = await db.collection('staking').get();
      
      const batch = db.batch();
      let updateCount = 0;

      for (const doc of stakingSnapshot.docs) {
        const stakingData = doc.data();
        
        if (stakingData.stakedAmount > 0) {
          // Calculate daily rewards (APY / 365)
          const dailyRewardRate = (stakingData.apy || 120) / 365 / 100;
          const dailyReward = stakingData.stakedAmount * dailyRewardRate;
          
          batch.update(doc.ref, {
            totalRewards: admin.firestore.FieldValue.increment(dailyReward),
            lastRewardDistribution: admin.firestore.FieldValue.serverTimestamp()
          });
          
          updateCount++;
        }
      }

      if (updateCount > 0) {
        await batch.commit();
        console.log(`Distributed rewards to ${updateCount} stakers`);
      }

    } catch (error) {
      console.error('Error distributing staking rewards:', error);
    }
  });
