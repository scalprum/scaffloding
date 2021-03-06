import React from 'react';
import * as asyncComponent from './async-loader';
import { ScalprumComponent, ScalprumComponentProps } from './scalprum-component';
import { render, cleanup, act } from '@testing-library/react';
import * as ScalprumCore from '@scalprum/core';
import { AppsConfig, GLOBAL_NAMESPACE } from '@scalprum/core';

describe('<ScalprumComponent />', () => {
  const mockInitScalprumConfig: AppsConfig = {
    appOne: {
      name: 'appOne',
      appId: 'appOne',
      rootLocation: '/foo',
      scriptLocation: '/bar.js',
      elementId: 'id',
    },
  };

  const mockInitScalpumConfigManifest: AppsConfig = {
    appOne: {
      name: 'appOne',
      appId: 'appOne',
      rootLocation: '/foo',
      manifestLocation: '/bar.json',
      elementId: 'id',
    },
  };
  const getAppDataSpy = jest.spyOn(ScalprumCore, 'getAppData').mockReturnValue(mockInitScalprumConfig.appOne);
  const injectScriptSpy = jest.spyOn(ScalprumCore, 'injectScript');
  const processManifestSpy = jest.spyOn(ScalprumCore, 'processManifest');
  const loadComponentSpy = jest.spyOn(asyncComponent, 'loadComponent').mockReturnValue(() => import('./TestComponent'));

  afterEach(() => {
    cleanup();
    window[GLOBAL_NAMESPACE] = undefined;
    getAppDataSpy.mockClear();
    injectScriptSpy.mockClear();
    processManifestSpy.mockClear();
  });

  test('should retrieve script location', () => {
    ScalprumCore.initialize({ scalpLets: mockInitScalprumConfig });
    ScalprumCore.setPendingInjection('appOne', jest.fn());
    ScalprumCore.initializeApp({ name: 'appOne', id: 'id', mount: jest.fn(), unmount: jest.fn(), update: jest.fn() });
    render(<ScalprumComponent appName="appOne" scope="some" module="test" />);

    expect(getAppDataSpy).toHaveBeenCalledWith('appOne');
  });

  test('should retrieve manifest location', () => {
    getAppDataSpy.mockReturnValueOnce(mockInitScalpumConfigManifest.appOne);
    ScalprumCore.initialize({ scalpLets: mockInitScalpumConfigManifest });
    ScalprumCore.setPendingInjection('appOne', jest.fn());
    ScalprumCore.initializeApp({ name: 'appOne', id: 'id', mount: jest.fn(), unmount: jest.fn(), update: jest.fn() });
    render(<ScalprumComponent appName="appOne" scope="some" module="test" />);

    expect(getAppDataSpy).toHaveBeenCalledWith('appOne');
  });

  test('should inject script and mount app if it was not initialized before', async () => {
    const mount = jest.fn();
    ScalprumCore.initialize({ scalpLets: mockInitScalprumConfig });
    injectScriptSpy.mockImplementationOnce(() => {
      ScalprumCore.setPendingInjection('appOne', jest.fn());
      ScalprumCore.initializeApp({ name: 'appOne', mount, unmount: jest.fn(), update: jest.fn(), id: 'appOne' });
      return Promise.resolve(['', undefined]);
    });
    await act(async () => {
      render(<ScalprumComponent appName="appOne" scope="some" module="test" />);
    });

    expect(mount).toHaveBeenCalled();
    expect(injectScriptSpy).toHaveBeenCalledWith('appOne', '/bar.js');
  });

  test('should inject manifest and mount app if it was not initialized before', async () => {
    getAppDataSpy.mockReturnValueOnce(mockInitScalpumConfigManifest.appOne);
    const mount = jest.fn();
    ScalprumCore.initialize({ scalpLets: mockInitScalpumConfigManifest });
    processManifestSpy.mockImplementationOnce(() => {
      ScalprumCore.setPendingInjection('appOne', jest.fn());
      ScalprumCore.initializeApp({ name: 'appOne', mount, unmount: jest.fn(), update: jest.fn(), id: 'appOne' });
      return Promise.resolve([['', undefined]]);
    });
    await act(async () => {
      render(<ScalprumComponent appName="appOne" scope="some" module="test" />);
    });

    expect(mount).toHaveBeenCalled();
    expect(processManifestSpy).toHaveBeenCalledWith('/bar.json', 'appOne', 'some', undefined);
  });

  test('should not inject script the app was initialized before', async () => {
    const mount = jest.fn();
    ScalprumCore.initialize({ scalpLets: mockInitScalprumConfig });
    ScalprumCore.setPendingInjection('appOne', jest.fn());
    ScalprumCore.initializeApp({ name: 'appOne', mount, unmount: jest.fn(), update: jest.fn(), id: 'appOne' });
    await act(async () => {
      render(<ScalprumComponent appName="appOne" scope="some" module="test" />);
    });

    expect(mount).toHaveBeenCalled();
    expect(injectScriptSpy).not.toHaveBeenCalled();
    expect(processManifestSpy).not.toHaveBeenCalled();
  });

  test('should not process manifest the app was initialized before', async () => {
    getAppDataSpy.mockReturnValueOnce(mockInitScalpumConfigManifest.appOne);
    const mount = jest.fn();
    ScalprumCore.initialize({ scalpLets: mockInitScalpumConfigManifest });
    ScalprumCore.setPendingInjection('appOne', jest.fn());
    ScalprumCore.initializeApp({ name: 'appOne', mount, unmount: jest.fn(), update: jest.fn(), id: 'appOne' });
    await act(async () => {
      render(<ScalprumComponent appName="appOne" scope="some" module="test" />);
    });

    expect(mount).toHaveBeenCalled();
    expect(processManifestSpy).not.toHaveBeenCalled();
    expect(injectScriptSpy).not.toHaveBeenCalled();
  });

  test('should render test component', async () => {
    const mount = jest.fn();
    ScalprumCore.initialize({ scalpLets: mockInitScalprumConfig });
    injectScriptSpy.mockImplementationOnce(() => {
      ScalprumCore.setPendingInjection('appOne', jest.fn());
      ScalprumCore.initializeApp({ name: 'appOne', mount, unmount: jest.fn(), update: jest.fn(), id: 'appOne' });
      return Promise.resolve(['', undefined]);
    });
    let container;

    const props: ScalprumComponentProps<{ apiProp: () => void }, { testProp: number }> = {
      testProp: 5,
      appName: 'appOne',
      scope: 'some',
      module: 'test',
      api: {
        apiProp: () => undefined,
      },
    };
    await act(async () => {
      container = render(<ScalprumComponent {...props} />)?.container;
      expect(container).toMatchSnapshot();
    });

    expect(loadComponentSpy).toHaveBeenCalled();
    expect(container).toMatchSnapshot();
  });

  test('should render test component with manifest', async () => {
    getAppDataSpy.mockReturnValueOnce(mockInitScalpumConfigManifest.appOne);
    const mount = jest.fn();
    ScalprumCore.initialize({ scalpLets: mockInitScalprumConfig });
    processManifestSpy.mockImplementationOnce(() => {
      ScalprumCore.setPendingInjection('appOne', jest.fn());
      ScalprumCore.initializeApp({ name: 'appOne', mount, unmount: jest.fn(), update: jest.fn(), id: 'appOne' });
      return Promise.resolve([['', undefined]]);
    });
    let container;
    await act(async () => {
      container = render(<ScalprumComponent appName="appOne" scope="some" module="test" />)?.container;
    });

    expect(loadComponentSpy).toHaveBeenCalled();
    expect(container).toMatchSnapshot();
  });

  test('should render fallback component', async () => {
    jest.useFakeTimers();
    /**
     * We need the async component "hang" to render the fallback
     */
    jest
      .spyOn(asyncComponent, 'loadComponent')
      .mockReturnValueOnce(() => new Promise((res) => setTimeout(() => res(import('./TestComponent')), 500)));
    const mount = jest.fn();
    ScalprumCore.initialize({ scalpLets: mockInitScalprumConfig });
    injectScriptSpy.mockImplementationOnce(() => {
      ScalprumCore.setPendingInjection('appOne', jest.fn());
      ScalprumCore.initializeApp({ name: 'appOne', mount, unmount: jest.fn(), update: jest.fn(), id: 'appOne' });
      return Promise.resolve(['', undefined]);
    });

    const props: ScalprumComponentProps = {
      appName: 'appOne',
      scope: 'some',
      module: 'test',
      LoadingComponent: () => <h1>Loading</h1>,
      fallback: <h1>Suspense fallback</h1>,
    };
    const { container } = render(<ScalprumComponent {...props} />);
    /**
     * Should render Loading component
     */
    expect(container).toMatchSnapshot();
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    /**
     * Should render fallback component
     */
    expect(container).toMatchSnapshot();
  });

  test('should render error component', async () => {
    jest.spyOn(asyncComponent, 'loadComponent').mockReturnValueOnce(() =>
      import('./TestComponent').then(() => {
        throw 'foo';
      })
    );
    const mount = jest.fn();
    ScalprumCore.initialize({ scalpLets: mockInitScalprumConfig });
    injectScriptSpy.mockImplementationOnce(() => {
      ScalprumCore.setPendingInjection('appOne', jest.fn());
      ScalprumCore.initializeApp({ name: 'appOne', mount, unmount: jest.fn(), update: jest.fn(), id: 'appOne' });
      return Promise.reject(['', undefined]);
    });

    const props: ScalprumComponentProps = {
      appName: 'appOne',
      scope: 'some',
      module: 'test',
      ErrorComponent: <h1>Custom error component</h1>,
    };
    let container;
    await act(async () => {
      container = render(<ScalprumComponent {...props} />).container;
    });
    expect(container).toMatchSnapshot();
  });
});
