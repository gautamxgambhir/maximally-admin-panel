import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, TestTube, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { getApiBaseUrl, getAuthHeaders } from '@/lib/apiHelpers';

interface TestResult {
  success: boolean;
  message: string;
  timestamp: string;
  responseTime: number;
  statusCode: number;
}

export function RateLimitTest() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [testCount, setTestCount] = useState(5);

  const runRateLimitTest = async () => {
    setIsRunning(true);
    setResults([]);
    
    const testResults: TestResult[] = [];
    
    for (let i = 0; i < testCount; i++) {
      const startTime = Date.now();
      
      try {
        const baseUrl = getApiBaseUrl();
        const headers = await getAuthHeaders();
        
        const response = await fetch(`${baseUrl}/api/admin/newsletter/queue/stats`, {
          method: 'GET',
          headers,
        });
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        const result: TestResult = {
          success: response.ok,
          message: response.ok ? 'Request successful' : `HTTP ${response.status}: ${response.statusText}`,
          timestamp: new Date().toISOString(),
          responseTime,
          statusCode: response.status,
        };
        
        testResults.push(result);
        setResults([...testResults]);
        
        if (response.status === 429) {
          toast.warning(`Rate limit hit on request ${i + 1}`);
        }
        
        // Small delay between requests to see rate limiting in action
        if (i < testCount - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (error) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        const result: TestResult = {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          responseTime,
          statusCode: 0,
        };
        
        testResults.push(result);
        setResults([...testResults]);
      }
    }
    
    setIsRunning(false);
    
    const successCount = testResults.filter(r => r.success).length;
    const rateLimitCount = testResults.filter(r => r.statusCode === 429).length;
    
    if (rateLimitCount > 0) {
      toast.success(`Test completed: ${successCount}/${testCount} successful, ${rateLimitCount} rate limited`);
    } else {
      toast.success(`Test completed: ${successCount}/${testCount} successful`);
    }
  };

  const getResultIcon = (result: TestResult) => {
    if (result.statusCode === 429) {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
    return result.success ? 
      <CheckCircle2 className="h-4 w-4 text-green-500" /> : 
      <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getResultBadge = (result: TestResult) => {
    if (result.statusCode === 429) {
      return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Rate Limited</Badge>;
    }
    return result.success ? 
      <Badge variant="default">Success</Badge> : 
      <Badge variant="destructive">Failed</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Rate Limit Test
        </CardTitle>
        <CardDescription>
          Test the rate limiting functionality by sending multiple requests quickly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This test sends multiple requests to the newsletter API to verify rate limiting is working.
            You should see some requests get rate limited (HTTP 429) if the rate limiter is functioning properly.
          </AlertDescription>
        </Alert>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="test-count" className="text-sm font-medium">
              Number of requests:
            </label>
            <select
              id="test-count"
              value={testCount}
              onChange={(e) => setTestCount(Number(e.target.value))}
              className="px-3 py-1 border rounded text-sm"
              disabled={isRunning}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
          
          <Button 
            onClick={runRateLimitTest} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running Test...
              </>
            ) : (
              <>
                <TestTube className="h-4 w-4" />
                Run Test
              </>
            )}
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Test Results:</h4>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {results.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded text-sm">
                  <div className="flex items-center gap-2">
                    {getResultIcon(result)}
                    <span>Request {index + 1}</span>
                    {getResultBadge(result)}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{result.responseTime}ms</span>
                    <span>HTTP {result.statusCode}</span>
                    <span>{new Date(result.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="pt-2 border-t">
              <div className="grid grid-cols-3 gap-4 text-center text-sm">
                <div>
                  <div className="font-semibold text-green-600">
                    {results.filter(r => r.success).length}
                  </div>
                  <div className="text-muted-foreground">Successful</div>
                </div>
                <div>
                  <div className="font-semibold text-yellow-600">
                    {results.filter(r => r.statusCode === 429).length}
                  </div>
                  <div className="text-muted-foreground">Rate Limited</div>
                </div>
                <div>
                  <div className="font-semibold text-red-600">
                    {results.filter(r => !r.success && r.statusCode !== 429).length}
                  </div>
                  <div className="text-muted-foreground">Failed</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}