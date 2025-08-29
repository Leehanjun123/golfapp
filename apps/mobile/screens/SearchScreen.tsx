import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useOfflineAwareAPI } from '../contexts/OfflineContext';
import SearchBar from '../components/SearchBar';
import FilterModal from '../components/FilterModal';
import SortModal from '../components/SortModal';

interface SearchResult {
  id: string;
  type: 'analysis' | 'user' | 'challenge' | 'training';
  title: string;
  subtitle: string;
  date?: string;
  score?: number;
  avatar?: string;
  thumbnail?: string;
}

interface SearchFilters {
  type: string[];
  dateRange: 'all' | 'week' | 'month' | 'year';
  sortBy: 'relevance' | 'date' | 'score';
}

const SearchScreen: React.FC = () => {
  const { theme } = useTheme();
  const { makeRequest, isConnected } = useOfflineAwareAPI();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    type: ['analysis', 'user', 'challenge', 'training'],
    dateRange: 'all',
    sortBy: 'relevance',
  });

  useEffect(() => {
    loadRecentSearches();
  }, []);

  const filterGroups = [
    {
      id: 'type',
      title: '콘텐츠 유형',
      multiSelect: true,
      options: [
        { id: 'analysis', label: '스윙 분석', value: 'analysis', type: 'checkbox' as const },
        { id: 'user', label: '사용자', value: 'user', type: 'checkbox' as const },
        { id: 'challenge', label: '챌린지', value: 'challenge', type: 'checkbox' as const },
        { id: 'training', label: '훈련 계획', value: 'training', type: 'checkbox' as const },
      ],
    },
    {
      id: 'dateRange',
      title: '기간',
      multiSelect: false,
      options: [
        { id: 'all', label: '전체 기간', value: 'all', type: 'radio' as const },
        { id: 'week', label: '최근 1주일', value: 'week', type: 'radio' as const },
        { id: 'month', label: '최근 1개월', value: 'month', type: 'radio' as const },
        { id: 'year', label: '최근 1년', value: 'year', type: 'radio' as const },
      ],
    },
  ];

  const sortOptions = [
    { id: 'relevance', label: '관련성', field: 'relevance', order: 'desc' as const },
    { id: 'date_desc', label: '최신 순', field: 'date', order: 'desc' as const },
    { id: 'date_asc', label: '오래된 순', field: 'date', order: 'asc' as const },
    { id: 'score_desc', label: '점수 높은 순', field: 'score', order: 'desc' as const },
    { id: 'score_asc', label: '점수 낮은 순', field: 'score', order: 'asc' as const },
  ];

  useEffect(() => {
    if (searchQuery.length > 2) {
      performSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, filters]);

  const loadRecentSearches = () => {
    // 최근 검색어를 로드 (실제로는 AsyncStorage에서)
    setRecentSearches(['스윙 분석', '타이거 우즈', '드라이버 연습', '퍼팅 훈련']);
  };

  const performSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const response = await makeRequest(
        `/api/search?query=${encodeURIComponent(searchQuery)}&types=${filters.type.join(',')}&dateRange=${filters.dateRange}&sortBy=${filters.sortBy}`,
        {},
        `search_${searchQuery}_${JSON.stringify(filters)}`
      );

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={[
        styles.resultItem,
        { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
      ]}
      onPress={() => handleResultPress(item)}
    >
      <View style={styles.resultContent}>
        <View style={styles.resultHeader}>
          <View style={styles.typeIcon}>
            <Ionicons name={getTypeIcon(item.type)} size={20} color={theme.colors.primary} />
          </View>
          <View style={styles.resultInfo}>
            <Text style={[styles.resultTitle, { color: theme.colors.text }]}>
              {highlightText(item.title, searchQuery)}
            </Text>
            <Text style={[styles.resultSubtitle, { color: theme.colors.textSecondary }]}>
              {item.subtitle}
            </Text>
          </View>
          {item.score && (
            <View style={[styles.scoreContainer, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.scoreText}>{item.score}</Text>
            </View>
          )}
        </View>

        {item.date && (
          <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>
            {formatDate(item.date)}
          </Text>
        )}
      </View>

      {(item.thumbnail || item.avatar) && (
        <Image source={{ uri: item.thumbnail || item.avatar }} style={styles.resultImage} />
      )}
    </TouchableOpacity>
  );

  const renderRecentSearch = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[styles.recentItem, { backgroundColor: theme.colors.card }]}
      onPress={() => setSearchQuery(item)}
    >
      <Ionicons name="time" size={16} color={theme.colors.textSecondary} />
      <Text style={[styles.recentText, { color: theme.colors.text }]}>{item}</Text>
      <TouchableOpacity onPress={() => removeRecentSearch(item)}>
        <Ionicons name="close" size={16} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderFilterChips = () => (
    <View style={styles.filterChips}>
      {['analysis', 'user', 'challenge', 'training'].map((type) => (
        <TouchableOpacity
          key={type}
          style={[
            styles.filterChip,
            {
              backgroundColor: filters.type.includes(type)
                ? theme.colors.primary
                : theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
          onPress={() => toggleFilter(type)}
        >
          <Text
            style={[
              styles.filterChipText,
              { color: filters.type.includes(type) ? 'white' : theme.colors.text },
            ]}
          >
            {getFilterLabel(type)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'analysis':
        return 'analytics';
      case 'user':
        return 'person';
      case 'challenge':
        return 'trophy';
      case 'training':
        return 'fitness';
      default:
        return 'document';
    }
  };

  const getFilterLabel = (type: string) => {
    switch (type) {
      case 'analysis':
        return '분석';
      case 'user':
        return '사용자';
      case 'challenge':
        return '챌린지';
      case 'training':
        return '훈련';
      default:
        return type;
    }
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    // 실제로는 Text 컴포넌트에서 하이라이트 처리
    return text;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleResultPress = (item: SearchResult) => {
    // 결과 항목 선택 시 해당 화면으로 네비게이션
    console.log('Selected result:', item);
  };

  const toggleFilter = (type: string) => {
    setFilters((prev) => ({
      ...prev,
      type: prev.type.includes(type) ? prev.type.filter((t) => t !== type) : [...prev.type, type],
    }));
  };

  const removeRecentSearch = (search: string) => {
    setRecentSearches((prev) => prev.filter((s) => s !== search));
  };

  const handleApplyFilters = (newFilters: any) => {
    const updatedFilters = {
      type: newFilters.type || [],
      dateRange: newFilters.dateRange?.[0] || 'all',
      sortBy: filters.sortBy,
    };
    setFilters(updatedFilters);
  };

  const handleSortChange = (sortOption: any) => {
    setFilters((prev) => ({
      ...prev,
      sortBy: sortOption.field,
    }));
  };

  const currentSort = sortOptions.find((opt) => opt.field === filters.sortBy);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SearchBar
        placeholder="스윙 분석, 사용자, 챌린지 검색..."
        onSearchChange={setSearchQuery}
        onFilterPress={() => setShowFilters(!showFilters)}
        autoFocus={true}
      />

      {searchResults.length > 0 && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={[
              styles.sortButton,
              { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
            ]}
            onPress={() => setShowSort(true)}
          >
            <Ionicons name="swap-vertical" size={16} color={theme.colors.primary} />
            <Text style={[styles.sortButtonText, { color: theme.colors.primary }]}>
              {currentSort?.label || '정렬'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {showFilters && renderFilterChips()}

      {searchQuery.length === 0 ? (
        <View style={styles.recentContainer}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>최근 검색</Text>
          <FlatList
            data={recentSearches}
            renderItem={renderRecentSearch}
            keyExtractor={(item, index) => index.toString()}
            showsVerticalScrollIndicator={false}
          />
        </View>
      ) : (
        <View style={styles.resultsContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                검색 중...
              </Text>
            </View>
          ) : searchResults.length > 0 ? (
            <>
              <Text style={[styles.resultsCount, { color: theme.colors.textSecondary }]}>
                {searchResults.length}개 결과 찾음
              </Text>
              <FlatList
                data={searchResults}
                renderItem={renderSearchResult}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={loading}
                    onRefresh={performSearch}
                    tintColor={theme.colors.primary}
                  />
                }
              />
            </>
          ) : searchQuery.length > 2 ? (
            <View style={styles.noResultsContainer}>
              <Ionicons name="search" size={64} color={theme.colors.textSecondary} />
              <Text style={[styles.noResultsTitle, { color: theme.colors.text }]}>
                검색 결과 없음
              </Text>
              <Text style={[styles.noResultsText, { color: theme.colors.textSecondary }]}>
                '{searchQuery}'에 대한 결과를 찾을 수 없습니다.{'\n'}
                다른 키워드로 검색해보세요.
              </Text>
            </View>
          ) : null}
        </View>
      )}

      {!isConnected && (
        <View
          style={[
            styles.offlineNotice,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
          ]}
        >
          <Ionicons name="wifi-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.offlineText, { color: theme.colors.textSecondary }]}>
            오프라인 모드 - 캐시된 결과만 표시됩니다
          </Text>
        </View>
      )}

      <FilterModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        onApplyFilters={handleApplyFilters}
        filterGroups={filterGroups}
        currentFilters={{
          type: filters.type,
          dateRange: [filters.dateRange],
        }}
      />

      <SortModal
        visible={showSort}
        onClose={() => setShowSort(false)}
        onSelectSort={handleSortChange}
        sortOptions={sortOptions}
        currentSort={currentSort}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  recentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  recentText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  filterChips: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  resultsCount: {
    fontSize: 14,
    marginBottom: 10,
  },
  resultItem: {
    flexDirection: 'row',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
  },
  resultContent: {
    flex: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  typeIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  resultInfo: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  resultSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  scoreContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  scoreText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 12,
    marginLeft: 32,
  },
  resultImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginLeft: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  noResultsText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    justifyContent: 'center',
  },
  offlineText: {
    marginLeft: 5,
    fontSize: 12,
  },
  actionBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'flex-end',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  sortButtonText: {
    marginLeft: 5,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default SearchScreen;
