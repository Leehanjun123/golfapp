import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dataService from '../services/dataService';
import { useAuth } from '../contexts/AuthContext';

export const useDataService = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 사용자 스윙 데이터 가져오기
  const getUserSwingHistory = async () => {
    if (!user?.id) return [];
    
    try {
      const historyStr = await AsyncStorage.getItem(`swing_history_${user.id}`);
      return historyStr ? JSON.parse(historyStr) : [];
    } catch (err) {
      console.error('Failed to load swing history:', err);
      return [];
    }
  };

  // 최신 스윙 데이터 가져오기
  const getLatestSwing = async () => {
    const history = await getUserSwingHistory();
    return history.length > 0 ? history[history.length - 1] : null;
  };

  // 프로와 비교
  const compareWithPro = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const latestSwing = await getLatestSwing();
      if (!latestSwing) {
        setError('스윙 데이터가 없습니다. 먼저 스윙 분석을 진행해주세요.');
        return null;
      }
      
      const comparison = await dataService.analyzeAgainstProStandards(latestSwing);
      return comparison;
    } catch (err: any) {
      setError(err.message || '비교 분석 실패');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // 개인 맞춤 훈련 계획 생성
  const generateTrainingPlan = async () => {
    if (!user?.id) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const plan = await dataService.generatePersonalizedTrainingPlan(user.id);
      return plan;
    } catch (err: any) {
      setError(err.message || '훈련 계획 생성 실패');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // 챌린지 생성
  const createChallenge = async (title: string, type: 'daily' | 'weekly' | 'monthly') => {
    if (!user?.id) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const challenge = await dataService.createLiveChallenge(user.id, title, type);
      return challenge;
    } catch (err: any) {
      setError(err.message || '챌린지 생성 실패');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // 챌린지 참가
  const joinChallenge = async (challengeId: string) => {
    if (!user?.id) return false;
    
    setLoading(true);
    setError(null);
    
    try {
      await dataService.joinChallenge(user.id, challengeId);
      return true;
    } catch (err: any) {
      setError(err.message || '챌린지 참가 실패');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 통계 가져오기
  const getStatistics = async () => {
    if (!user?.id) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const stats = await dataService.generateStatistics(user.id);
      return stats;
    } catch (err: any) {
      setError(err.message || '통계 로드 실패');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // 리더보드 가져오기
  const getLeaderboard = async (challengeId?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const leaderboard = await dataService.getRealTimeLeaderboard(challengeId);
      return leaderboard;
    } catch (err: any) {
      setError(err.message || '리더보드 로드 실패');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // 스윙 데이터 저장
  const saveSwingData = async (analysisResult: any) => {
    if (!user?.id) return false;
    
    try {
      const history = await getUserSwingHistory();
      const swingData = {
        id: `swing_${Date.now()}`,
        timestamp: new Date().toISOString(),
        ...analysisResult
      };
      
      history.push(swingData);
      await AsyncStorage.setItem(`swing_history_${user.id}`, JSON.stringify(history));
      
      // 모든 사용자 목록에 추가 (리더보드용)
      const allUsersStr = await AsyncStorage.getItem('all_users');
      const allUsers = allUsersStr ? JSON.parse(allUsersStr) : [];
      if (!allUsers.includes(user.id)) {
        allUsers.push(user.id);
        await AsyncStorage.setItem('all_users', JSON.stringify(allUsers));
      }
      
      return true;
    } catch (err) {
      console.error('Failed to save swing data:', err);
      return false;
    }
  };

  return {
    loading,
    error,
    getUserSwingHistory,
    getLatestSwing,
    compareWithPro,
    generateTrainingPlan,
    createChallenge,
    joinChallenge,
    getStatistics,
    getLeaderboard,
    saveSwingData
  };
};